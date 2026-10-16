// app/api/customers/revisit/route.ts
// ============================================================
// 사장님 — 재방문 분석 (LU-017)
// GET /api/customers/revisit
// · 내 스탬프카드의 적립 이력(stamp_events)으로 재방문율 · 재방문 주기 · 이탈 위험 단골을 계산
// · 매출 연동 없음 · QR 적립 기준 (수동 적립 · 조정은 이벤트가 남지 않아 빠진다)
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { analyzeRevisits, type StampVisitEvent } from '@/app/lib/revisit-analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOOKBACK_DAYS = 400
const PAGE_SIZE = 1000
const MAX_EVENTS = 20000
const VISIT_EVENT_TYPES = ['enrolled', 'stamped', 'reward_claimed']

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data: cards, error: cardErr } = await svc
    .from('stamp_cards')
    .select('id')
    .eq('user_id', auth.userId)
  if (cardErr) return NextResponse.json({ ok: false, error: cardErr.message }, { status: 500 })

  const cardIds = (cards || []).map(c => c.id)
  if (cardIds.length === 0) return NextResponse.json({ ok: true, hasCard: false, summary: null })

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const events: StampVisitEvent[] = []
  let truncated = false
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await svc
      .from('stamp_events')
      .select('collection_id, created_at')
      .in('stamp_card_id', cardIds)
      .in('event_type', VISIT_EVENT_TYPES)
      .gte('created_at', since)
      .order('created_at', { ascending: false }) // 넘치면 최근 기록부터 남긴다
      .range(from, from + PAGE_SIZE - 1)
    // 이력 테이블이 없는 환경이면 분석을 끄고 화면은 안내만 띄운다
    if (error) return NextResponse.json({ ok: true, hasCard: true, available: false, summary: null })
    events.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    if (events.length >= MAX_EVENTS) { truncated = true; break }
  }

  const summary = analyzeRevisits(events)

  // 이탈 위험 단골은 이름 · 가린 번호를 붙여 상위 10명만 내린다
  const top = summary.atRisk.slice(0, 10)
  let atRisk: Array<typeof top[number] & { name: string | null; phoneMasked: string | null; consentMarketing: boolean }> = []
  if (top.length > 0) {
    const { data: rows } = await svc
      .from('stamp_collections')
      .select('id, customer_name, customer_phone, consent_marketing')
      .in('id', top.map(r => r.collectionId))
    const byId = new Map((rows || []).map(r => [r.id, r]))
    atRisk = top.map(r => {
      const c = byId.get(r.collectionId)
      const phone: string | null = c?.customer_phone ?? null
      return {
        ...r,
        name: c?.customer_name ?? null,
        phoneMasked: phone ? phone.slice(0, 3) + '-****-' + phone.slice(-2) : null,
        consentMarketing: Boolean(c?.consent_marketing),
      }
    })
  }

  return NextResponse.json({
    ok: true,
    hasCard: true,
    available: true,
    truncated,
    summary: { ...summary, atRisk, atRiskTotal: summary.atRisk.length },
  })
}
