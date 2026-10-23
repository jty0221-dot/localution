// app/api/reply-voice/route.ts
// ============================================================
// LU-018 W2-10 · 답글 말투 설정 — 계정 하나의 서버 저장
//
//   GET  → { ok, storage: 'ready'|'missing', saved, voice, updated_at }
//   PUT  { voice, migrate_from_browser? } → 저장 후 같은 모양으로 응답
//
// · 저장소 : reply_voice_settings (supabase/migrations/20261023_reply_voice_settings.sql · 실행은 결재 C)
//   테이블이 없으면 GET 은 storage='missing' + 기본값, PUT 은 503 storage_not_ready.
//   저장된 척하지 않는다.
// · 자동답글 크론은 platform_credentials.extra_data.autoreply_tone 을 읽는다 →
//   PUT 이 성공하면 이 계정의 연결된 매체 행 autoreply_tone 도 같은 말투로 맞춘다
//   (수동 답글 · 자동답글이 같은 말투를 쓰게). 맞추기 실패는 저장 성공을 뒤집지 않고 결과에 적는다.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { checkRate } from '@/app/lib/rateLimit'
import {
  DEFAULT_REPLY_VOICE, normalizeReplyVoice, toAutoreplyTone, isMissingTableError,
} from '@/app/lib/reply-voice'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TABLE = 'reply_voice_settings'
const AUTOREPLY_PLATFORMS = ['naver_place', 'kakao_map', 'baemin', 'yogiyo', 'coupangeats']

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from(TABLE)
    .select('settings, updated_at, migrated_from_browser_at')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ ok: true, storage: 'missing', saved: false, voice: DEFAULT_REPLY_VOICE, updated_at: null })
    }
    console.warn('[reply-voice] select failed:', error.message)
    return NextResponse.json({ ok: false, error: '말투 설정을 불러오지 못했어요.' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    storage: 'ready',
    saved: !!data,
    voice: normalizeReplyVoice(data?.settings ?? {}),
    updated_at: data?.updated_at ?? null,
    migrated_from_browser: !!data?.migrated_from_browser_at,
  })
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const rl = checkRate(`reply-voice:${auth.userId}`, 30, 60)
  if (!rl.ok) return NextResponse.json({ ok: false, error: '저장 요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const migrate = body.migrate_from_browser === true
  const svc = createServiceClient()

  // 기존 값 위에 덮는다 (화면마다 다루는 항목이 달라도 다른 항목을 지우지 않게)
  const { data: existing, error: readErr } = await svc
    .from(TABLE)
    .select('settings, migrated_from_browser_at')
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (readErr) {
    if (isMissingTableError(readErr)) {
      return NextResponse.json(
        { ok: false, code: 'storage_not_ready', storage: 'missing', error: '말투를 서버에 저장할 준비가 아직 안 됐어요. 관리자에게 알려 주세요.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ ok: false, error: '말투 설정을 불러오지 못했어요.' }, { status: 500 })
  }
  // 브라우저 이관은 서버에 값이 없을 때 한 번만 — 다른 기기에서 정한 값을 덮지 않는다
  if (migrate && existing) {
    return NextResponse.json({
      ok: true, storage: 'ready', saved: true, skipped: 'already_saved',
      voice: normalizeReplyVoice(existing.settings ?? {}),
    })
  }

  const base = normalizeReplyVoice(existing?.settings ?? {})
  const voice = normalizeReplyVoice(body.voice ?? {}, base)
  const now = new Date().toISOString()
  const row: Record<string, unknown> = { user_id: auth.userId, settings: voice, updated_at: now }
  if (migrate) row.migrated_from_browser_at = now
  const { error: upErr } = await svc.from(TABLE).upsert(row, { onConflict: 'user_id' })
  if (upErr) {
    if (isMissingTableError(upErr)) {
      return NextResponse.json(
        { ok: false, code: 'storage_not_ready', storage: 'missing', error: '말투를 서버에 저장할 준비가 아직 안 됐어요. 관리자에게 알려 주세요.' },
        { status: 503 },
      )
    }
    console.warn('[reply-voice] upsert failed:', upErr.message)
    return NextResponse.json({ ok: false, error: '말투 설정을 저장하지 못했어요.' }, { status: 500 })
  }

  // 자동답글 말투 맞추기 (이 계정 · 연결된 매체 행만)
  let autoreplySynced: number | null = 0
  try {
    const { data: creds, error } = await svc
      .from('platform_credentials')
      .select('platform, extra_data')
      .eq('user_id', auth.userId)
      .in('platform', AUTOREPLY_PLATFORMS)
    if (error) throw error
    const tone = toAutoreplyTone(voice.tone)
    for (const c of creds ?? []) {
      const prev = (c.extra_data as Record<string, unknown>) || {}
      if (prev.autoreply_tone === tone) { autoreplySynced = (autoreplySynced ?? 0) + 1; continue }
      const { error: e2 } = await svc
        .from('platform_credentials')
        .update({ extra_data: { ...prev, autoreply_tone: tone } })
        .eq('user_id', auth.userId)
        .eq('platform', c.platform)
      if (!e2) autoreplySynced = (autoreplySynced ?? 0) + 1
    }
  } catch (e) {
    console.warn('[reply-voice] autoreply tone sync failed:', e)
    autoreplySynced = null
  }

  return NextResponse.json({
    ok: true, storage: 'ready', saved: true, voice, updated_at: now,
    autoreply_synced: autoreplySynced,
  })
}
