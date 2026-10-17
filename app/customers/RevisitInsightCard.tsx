'use client'

// 고객 관리 — 재방문 분석 카드 (LU-017)
// /api/customers/revisit 의 결과를 보여 준다. 스탬프카드가 없으면 그리지 않는다.

import { useEffect, useState } from 'react'
import { Repeat, TrendingUp, TrendingDown, CalendarClock, UserPlus, AlertTriangle, Info } from 'lucide-react'

type AtRisk = {
  collectionId: string
  name: string | null
  phoneMasked: string | null
  lastVisit: string
  daysSinceLastVisit: number
  avgGapDays: number
  visits: number
  consentMarketing: boolean
}

type Summary = {
  month: string
  totalCustomers: number
  totalVisits: number
  visitorsThisMonth: number
  returningThisMonth: number
  newThisMonth: number
  revisitRate: number | null
  revisitRatePrev: number | null
  revisitRateDelta: number | null
  avgGapDays: number | null
  medianGapDays: number | null
  regulars: number
  atRisk: AtRisk[]
  atRiskTotal: number
  insufficient: boolean
}

type Resp = { ok: boolean; hasCard?: boolean; available?: boolean; truncated?: boolean; summary: Summary | null }

type LoadState =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'error'; code: number }
  | { status: 'done'; data: Resp }

export default function RevisitInsightCard() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    fetch('/api/customers/revisit', { cache: 'no-store' })
      .then(async r => {
        if (!alive) return
        if (r.status === 401) { setState({ status: 'unauth' }); return }
        const j = (await r.json().catch(() => null)) as Resp | null
        if (!alive) return
        if (!r.ok || !j || !j.ok) { setState({ status: 'error', code: r.status }); return }
        setState({ status: 'done', data: j })
      })
      .catch(() => { if (alive) setState({ status: 'error', code: 0 }) })
    return () => { alive = false }
  }, [])

  // 불러오는 중 · 로그인 전에는 그리지 않는다 (페이지 자체가 로그인으로 넘긴다)
  if (state.status === 'loading' || state.status === 'unauth') return null

  const data = state.status === 'done' ? state.data : null
  const s = data?.summary ?? null
  const delta = s?.revisitRateDelta ?? null
  // 스탬프카드가 없거나 적립 기록이 0건이면 숫자 대신 시작 안내
  const needsSetup = !!data && (!data.hasCard || data.available === false || !s || s.totalVisits === 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#059669] to-[#3182F6] ring-1 ring-[#059669]/20 flex items-center justify-center shadow-sm">
          <Repeat size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black text-[#191F28]">재방문 분석</h2>
          <p className="text-xs text-[#8B95A1]">스탬프 적립 기록으로 계산 · 매출 연동 없이 단골 흐름을 봐요</p>
        </div>
      </div>

      {state.status === 'error' ? (
        <p className="text-sm text-[#DC2626] bg-[#FFF1F2] rounded-xl p-4">
          재방문 분석을 불러오지 못했어요{state.code ? ` (오류 ${state.code})` : ''}. 잠시 뒤 새로고침해 주세요.
        </p>
      ) : needsSetup || !data || !s ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8F9FA] rounded-xl p-4">
          <p className="text-sm text-[#4E5968] leading-relaxed">
            {data && !data.hasCard
              ? '아직 스탬프카드가 없어요. 매장 스탬프 QR 을 만들고 손님이 적립을 시작하면 재방문율 · 단골 주기 · 발길 끊길 단골이 여기 쌓입니다.'
              : '아직 QR 스탬프 적립 기록이 없어요. 손님이 매장 QR 로 적립을 시작하면 재방문율 · 단골 주기 · 발길 끊길 단골이 여기 쌓입니다.'}
          </p>
          <a
            href="/qr-admin"
            className="shrink-0 text-center px-4 py-2.5 rounded-xl text-sm font-bold bg-[#3182F6] text-white hover:bg-[#1B64DA]">
            {data && !data.hasCard ? '스탬프 QR 만들기' : '스탬프 QR 설정하기'}
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric
              label="이번 달 재방문율"
              value={s.revisitRate === null ? '-' : `${s.revisitRate}%`}
              sub={
                delta === null ? `방문 손님 ${s.visitorsThisMonth}명 중 ${s.returningThisMonth}명`
                  : `지난달보다 ${Math.abs(delta)}%p ${delta >= 0 ? '올랐어요' : '내렸어요'}`
              }
              icon={delta !== null && delta < 0 ? TrendingDown : TrendingUp}
              color={delta !== null && delta < 0 ? '#DC2626' : '#3182F6'}
            />
            <Metric
              label="단골 평균 재방문 주기"
              value={s.avgGapDays === null ? '-' : `${s.avgGapDays}일`}
              sub={s.medianGapDays === null ? '두 번 이상 온 손님이 아직 없어요' : `가운데값 ${s.medianGapDays}일 · 단골 ${s.regulars}명`}
              icon={CalendarClock}
              color="#7C3AED"
            />
            <Metric
              label="이번 달 새 손님"
              value={`${s.newThisMonth}명`}
              sub={`누적 적립 손님 ${s.totalCustomers}명`}
              icon={UserPlus}
              color="#059669"
            />
            <Metric
              label="발길 끊길 위험 단골"
              value={`${s.atRiskTotal}명`}
              sub="평소 주기의 두 배 넘게 안 온 단골"
              icon={AlertTriangle}
              color="#F59E0B"
            />
          </div>

          {s.atRisk.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-[#4E5968] mb-2">먼저 연락해 볼 단골</p>
              <ul className="divide-y divide-[#F2F4F6] border border-[#F2F4F6] rounded-xl">
                {s.atRisk.map(r => (
                  <li key={r.collectionId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0 whitespace-nowrap">
                      <span className="font-bold text-[#191F28]">{r.name || '이름 없음'}</span>
                      <span className="text-xs text-[#8B95A1] ml-2">{r.phoneMasked}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 text-xs">
                      <span className="text-[#4E5968] whitespace-nowrap">평소 {r.avgGapDays}일마다 · 마지막 {r.daysSinceLastVisit}일 전</span>
                      {r.consentMarketing && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#EFF6FF] text-[#3182F6] font-bold">수신 동의</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="flex items-start gap-1.5 text-[11px] text-[#8B95A1] mt-3 leading-relaxed">
            <Info size={12} className="mt-0.5 shrink-0" strokeWidth={2.5} />
            <span>
              QR 스탬프 적립 기준이에요. 같은 날 여러 번 적립은 한 번으로 보고, 직접 추가 · 조정한 스탬프는 빠집니다.
              {s.insufficient && ' 아직 적립 기록이 20건 미만이라 숫자가 크게 흔들릴 수 있어요.'}
              {data.truncated && ' 기록이 많아 최근 2만 건까지만 계산했어요.'}
            </span>
          </p>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string
  sub: string
  icon: typeof Repeat
  color: string
}) {
  return (
    <div className="rounded-xl bg-[#F8F9FA] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={14} style={{ color }} strokeWidth={2.5} />
        <span className="text-xs font-medium text-[#4E5968]">{label}</span>
      </div>
      <div className="text-xl font-black" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[#8B95A1] mt-0.5 leading-snug">{sub}</div>
    </div>
  )
}
