// app/api/qr/stats/route.ts
// ============================================================
// 사장님용 QR 활동 통계 조회
// GET /api/qr/stats?days=7 → 본인 매장 활동 집계
//
// · 인증 필요
// · 본인 user_id 의 qr_review_logs 만 조회
// · 일/주별 카운트 + 이벤트별 funnel + 최근 활동
//
// LU-018 W2-6 · 500행 잘림 해소
// · 예전에는 .limit(500) 한 번으로 끝나 바쁜 매장(하루 수십 스캔 × 30~90일)은 숫자가 과소 집계됐다
// · 이제 기간 안의 행을 1,000행씩 끝까지 읽어 집계한다 (안전 상한 100,000행 · 넘으면 truncated=true 로 알린다)
// · 집계 계산은 app/lib/qr-stats.ts (순수 함수 · 테스트 scripts/qr-stats.test.mjs)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { aggregateQrStats, type QrLogRow } from '@/app/lib/qr-stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000
const MAX_ROWS = 100_000

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '7', 10) || 7))
 const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

 const svc = createServiceClient()

 // 1) 기간 안 전체 행 — 집계에 필요한 열만 · 페이지 단위
 //    created_at · id 순으로 고정해 페이지 사이에 행이 빠지거나 겹치지 않게 한다
 const rows: QrLogRow[] = []
 let truncated = false
 for (let from = 0; ; from += PAGE_SIZE) {
 const { data, error } = await svc
 .from('qr_review_logs')
 .select('event_type, device_kind, visitor_hash, created_at')
 .eq('user_id', auth.userId)
 .gte('created_at', since)
 .order('created_at', { ascending: false })
 .order('id', { ascending: false })
 .range(from, from + PAGE_SIZE - 1)
 if (error) {
 return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
 }
 const page = (data || []) as QrLogRow[]
 rows.push(...page)
 if (page.length < PAGE_SIZE) break
 if (rows.length >= MAX_ROWS) { truncated = true; break }
 }

 // 2) 최근 활동 타임라인 (20개) — meta 는 여기서만 읽는다
 const { data: recentRows, error: recentError } = await svc
 .from('qr_review_logs')
 .select('event_type, device_kind, meta, created_at')
 .eq('user_id', auth.userId)
 .gte('created_at', since)
 .order('created_at', { ascending: false })
 .limit(20)
 if (recentError) {
 return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
 }

 const agg = aggregateQrStats(rows, days)
 const recent = (recentRows || []).map(r => ({
 event_type: r.event_type,
 device_kind: r.device_kind,
 meta: r.meta,
 created_at: r.created_at,
 }))

 return NextResponse.json({
 ok: true,
 period: { days, since },
 counts: agg.counts,
 funnel: agg.funnel,
 unique_visitors: agg.unique_visitors,
 devices: agg.devices,
 daily: agg.daily,
 recent,
 rows_counted: rows.length,
 truncated,
 })
}
