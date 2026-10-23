// app/lib/qr-stats.ts
// ============================================================
// QR 활동 통계 집계 (LU-018 W2-6) · 순수 함수
// · /api/qr/stats 가 기간 안의 qr_review_logs 를 페이지 단위로 전부 읽어 여기로 넘긴다
//   (예전에는 최근 500행에서 잘려 바쁜 매장이 과소 집계됐다)
// · 날짜 묶음은 기존 화면과 같게 created_at 의 UTC 날짜(앞 10자)를 쓴다
// ============================================================

export type QrLogRow = {
  event_type: string | null
  device_kind: string | null
  visitor_hash: string | null
  created_at: string | null
}

export type QrDaily = { date: string; scan: number; submit: number; ai: number }

export type QrStatsAggregate = {
  counts: Record<string, number>
  funnel: {
    scan: number
    ai_generated: number
    submitted: number
    scan_to_ai_rate: number
    ai_to_submit_rate: number
    overall_rate: number
  }
  unique_visitors: number
  devices: Record<string, number>
  daily: QrDaily[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function aggregateQrStats(rows: readonly QrLogRow[], days: number, now: Date = new Date()): QrStatsAggregate {
  const counts: Record<string, number> = {}
  const dailyMap: Record<string, { scan: number; submit: number; ai: number }> = {}
  const uniqueVisitors = new Set<string>()
  const devices: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 }

  for (const r of rows) {
    const type = String(r.event_type || '')
    if (!type) continue
    counts[type] = (counts[type] || 0) + 1
    if (r.visitor_hash) uniqueVisitors.add(r.visitor_hash)
    if (r.device_kind) devices[r.device_kind] = (devices[r.device_kind] || 0) + 1
    const day = String(r.created_at || '').slice(0, 10)
    if (!day) continue
    if (!dailyMap[day]) dailyMap[day] = { scan: 0, submit: 0, ai: 0 }
    if (type === 'scan') dailyMap[day].scan += 1
    if (type === 'ai_generated') dailyMap[day].ai += 1
    if (type.startsWith('submitted_')) dailyMap[day].submit += 1
  }

  const scans = counts.scan || 0
  const aiCount = counts.ai_generated || 0
  const submits = (counts.submitted_naver || 0) + (counts.submitted_google || 0) + (counts.submitted_kakao || 0)

  const daily: QrDaily[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10)
    daily.push({ date: d, ...(dailyMap[d] || { scan: 0, submit: 0, ai: 0 }) })
  }

  return {
    counts,
    funnel: {
      scan: scans,
      ai_generated: aiCount,
      submitted: submits,
      scan_to_ai_rate: scans > 0 ? Math.round((aiCount / scans) * 100) : 0,
      ai_to_submit_rate: aiCount > 0 ? Math.round((submits / aiCount) * 100) : 0,
      overall_rate: scans > 0 ? Math.round((submits / scans) * 100) : 0,
    },
    unique_visitors: uniqueVisitors.size,
    devices,
    daily,
  }
}
