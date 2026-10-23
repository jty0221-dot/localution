'use client'
// app/dashboard/StoreStatusCard.tsx
// ============================================================
// LU-018 W2-3 · 내 가게 지금 상태
// · 합산 점수 · 등급 · 경쟁 대비 점수를 보여 주지 않는다 (대표 정정 2026-10-18)
// · 확인된 지표(측정일 · 출처) · 지난 측정 대비 변화(지표마다 따로) · 오늘 할 일 최대 3개
// · 값이 없으면 숫자 대신 '-' 와 상태(측정 전 · 측정 불가 · 조회 실패)
// ============================================================
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, RefreshCw, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  buildTodos,
  countChecklist,
  type Change,
  type KeywordStatus,
  type Metric,
  type ReviewSummary,
  type StampSummary,
} from '@/app/lib/store-status'

type StatusResponse = {
  ok: true
  user_id: string
  read_at: string
  sections: Record<'place' | 'reviews' | 'keywords' | 'stamps', 'read' | 'failed'>
  place: { name: string | null; placeId: string | null } | null
  hasPlaceTarget: boolean | null
  placeMetrics: Metric[]
  reviews: ReviewSummary | null
  reviewsTruncated: boolean
  keywords: KeywordStatus[]
  hasStampCard: boolean | null
  stamps: StampSummary
  stampsTruncated: boolean
}

type Tile = {
  key: string
  label: string
  value: string | null
  unit: string
  status: string | null
  change: string | null
  changeKind: 'up' | 'down' | 'same' | null
  meta: string
}

const card = 'min-w-0 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6'

function fmtDate(iso: string | null, withTime = true): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const base = `${get('month')}/${get('day')}(${get('weekday')})`
  return withTime ? `${base} ${get('hour')}:${get('minute')}` : base
}

function fmtNum(n: number, unit: string): string {
  return unit === '점' ? String(Number(n.toFixed(2))) : n.toLocaleString('ko-KR')
}

function changeText(c: Change | null, unit: string, prefix: string): { text: string | null; kind: Tile['changeKind'] } {
  if (!c) return { text: null, kind: null }
  if (c.kind === 'same') return { text: `${prefix} 변화 없음`, kind: 'same' }
  const sign = c.diff > 0 ? '+' : '-'
  return { text: `${prefix} ${sign}${fmtNum(Math.abs(c.diff), unit)}${unit} (${fmtNum(c.previous, unit)} → ${fmtNum(c.current, unit)})`, kind: c.kind }
}

function stateLabel(state: string, sectionFailed: boolean): string {
  if (sectionFailed) return '조회 실패'
  return state === 'not_yet' ? '측정 전' : state === 'unavailable' ? '측정 불가' : ''
}

function ChangeLine({ text, kind }: { text: string | null; kind: Tile['changeKind'] }) {
  if (!text) return <p className="mt-2 text-xs text-[var(--lu-muted)]">지난 측정 없음 · 변화 비교 전</p>
  const Icon = kind === 'up' ? TrendingUp : kind === 'down' ? TrendingDown : Minus
  return (
    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--lu-ink)] tabular-nums">
      <Icon size={14} aria-hidden="true" className="text-[var(--lu-muted)]" />
      {text}
    </p>
  )
}

export function buildTiles(data: StatusResponse): Tile[] {
  const tiles: Tile[] = []
  const placeFailed = data.sections.place === 'failed'
  for (const m of data.placeMetrics) {
    const ch = changeText(m.change, m.unit, m.change ? `${fmtDate(m.change.previousAt, false)} 대비` : '')
    tiles.push({
      key: m.key,
      label: m.label,
      value: m.state === 'measured' && m.value !== null ? fmtNum(m.value, m.unit) : null,
      unit: m.unit,
      status: m.state === 'measured' ? null : data.hasPlaceTarget === false ? '플레이스 미등록' : stateLabel(m.state, placeFailed),
      change: ch.text,
      changeKind: ch.kind,
      meta: m.measuredAt ? `측정 ${fmtDate(m.measuredAt)} · ${m.source}` : `출처 ${m.source}`,
    })
  }
  const r = data.reviews
  const reviewFailed = data.sections.reviews === 'failed' || !r
  const reviewMeta = r && r.measuredAt
    ? `마지막 수집 ${fmtDate(r.measuredAt)} · 로컬루션 수집 리뷰 ${r.total.toLocaleString('ko-KR')}건${data.reviewsTruncated ? ' (일부)' : ''}`
    : '출처 로컬루션 수집 리뷰'
  const reviewStatus = reviewFailed ? '조회 실패' : r!.state === 'not_yet' ? '측정 전' : null
  tiles.push({ key: 'unreplied', label: '답글 안 단 리뷰', value: reviewStatus ? null : String(r!.unreplied), unit: '건', status: reviewStatus, change: null, changeKind: null, meta: reviewMeta })
  tiles.push({ key: 'new7', label: '최근 7일 새 리뷰', value: reviewStatus ? null : String(r!.newLast7Days), unit: '건', status: reviewStatus, change: null, changeKind: null, meta: `작성일 기준 · 오늘 포함 7일 · ${reviewMeta}` })
  tiles.push({
    key: 'avg', label: '수집 리뷰 평균 별점',
    value: reviewStatus || r!.avgRating === null ? null : r!.avgRating.toFixed(1), unit: '점',
    status: reviewStatus ?? (r!.avgRating === null ? '측정 불가' : null), change: null, changeKind: null,
    meta: r && r.ratedCount ? `별점 있는 리뷰 ${r.ratedCount.toLocaleString('ko-KR')}건 평균 · ${reviewMeta}` : reviewMeta,
  })
  const s = data.stamps
  const stampStatus = data.hasStampCard === false ? '스탬프 카드 없음' : s.state === 'unavailable' ? '조회 실패' : null
  const sch = s.state === 'measured' ? changeText(s.change, '건', '지난 달 전체') : { text: null, kind: null }
  tiles.push({
    key: 'stamps', label: `이번 달 QR 적립 (${Number(s.month.slice(5))}월)`,
    value: stampStatus ? null : s.thisMonth.toLocaleString('ko-KR'), unit: '건', status: stampStatus,
    change: sch.text, changeKind: sch.kind,
    meta: s.state === 'measured'
      ? `적립 손님 ${s.customersThisMonth}명 · 마지막 적립 ${fmtDate(s.lastEventAt)} · 출처 스탬프 QR 적립 기록${data.stampsTruncated ? ' (일부)' : ''}`
      : '출처 스탬프 QR 적립 기록',
  })
  return tiles
}

function keywordValue(k: KeywordStatus): string {
  if (k.state === 'ranked') return `${k.rank}위`
  if (k.state === 'out_of_range') return k.total ? `권외 (상위 ${k.total}위 밖)` : '권외'
  if (k.state === 'unavailable') return '측정 불가'
  return '측정 전'
}

export default function StoreStatusCard({ expectedAccountId }: { expectedAccountId?: string | null }) {
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StatusResponse | null>(null)
  const [error, setError] = useState('')
  const [checklistChecked, setChecklistChecked] = useState<number | null>(null)
  const generation = useRef(0)

  useEffect(() => {
    const request = ++generation.current
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    setLoading(true); setError(''); setData(null); setChecklistChecked(null)
    fetch('/api/store-status', { signal: controller.signal, cache: 'no-store', credentials: 'include' })
      .then(async res => {
        const json = await res.json().catch(() => null)
        if (generation.current !== request) return
        if (!res.ok || !json || json.ok !== true) throw new Error(json?.error === 'offline' ? '인터넷 연결이 없어요. 연결을 확인한 뒤 다시 시도해보세요.' : '가게 상태 자료를 읽지 못했어요. 잠시 뒤 다시 시도해보세요.')
        if (expectedAccountId && String(json.user_id) !== expectedAccountId) throw new Error('다른 계정 자료라 표시하지 않았어요. 새로고침해 주세요.')
        setData(json as StatusResponse)
        const placeId = (json as StatusResponse).place?.placeId
        if (placeId) {
          try { setChecklistChecked(countChecklist(localStorage.getItem(`localution.place_check.${placeId}`))) } catch { setChecklistChecked(null) }
        }
      })
      .catch(e => {
        if (generation.current !== request) return
        setError(e instanceof Error && e.name !== 'AbortError' && e.message ? e.message : '가게 상태 자료를 읽지 못했어요. 잠시 뒤 다시 시도해보세요.')
      })
      .finally(() => {
        clearTimeout(timer)
        if (generation.current === request) setLoading(false)
      })
    return () => { ++generation.current; clearTimeout(timer); controller.abort() }
  }, [attempt, expectedAccountId])

  const todos = data
    ? buildTodos({
        unreplied: data.sections.reviews === 'read' && data.reviews ? data.reviews.unreplied : null,
        hasPlaceTarget: data.hasPlaceTarget,
        checklistChecked,
        hasStampCard: data.hasStampCard,
      })
    : []
  const tiles = data ? buildTiles(data) : []

  return (
    <section aria-labelledby="store-status-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="store-status-title" className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--lu-ink)]">
            <ClipboardList size={20} aria-hidden="true" className="text-[var(--lu-accent)]" />
            내 가게 지금 상태
          </h2>
          <p className="mt-1 break-words text-sm text-[var(--lu-muted)]">
            점수로 합치지 않고 확인된 숫자만 보여 드려요. 숫자마다 측정일과 출처를 붙였어요.
            {data?.place?.name ? ` · 플레이스: ${data.place.name}` : ''}
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => setAttempt(n => n + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-[var(--lu-line)] px-3 text-sm font-semibold text-[var(--lu-accent)] disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" />다시 읽기
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-4 text-sm text-[var(--lu-muted)]">가게 상태 자료를 읽고 있어요.</p>
      ) : error || !data ? (
        <div role="alert" className="mt-4 rounded-[6px] border border-[var(--lu-line)] p-4">
          <p className="text-sm text-[var(--lu-ink)]">{error || '가게 상태 자료를 읽지 못했어요.'}</p>
          <button type="button" onClick={() => setAttempt(n => n + 1)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--lu-accent)] underline">다시 시도</button>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-[var(--lu-ink)]">오늘 할 일</h3>
            {todos.length ? (
              <ol className="mt-2 divide-y divide-[var(--lu-line)]">
                {todos.map((t, i) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="break-words text-sm font-semibold text-[var(--lu-ink)] tabular-nums">{i + 1}) {t.title}</p>
                      <p className="mt-1 break-words text-xs text-[var(--lu-muted)]">{t.detail}</p>
                    </div>
                    <Link href={t.href} className="inline-flex min-h-11 items-center rounded-[6px] border border-[var(--lu-line)] px-3 text-sm font-semibold text-[var(--lu-accent)]">{t.action}</Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-[var(--lu-muted)]">확인된 자료에서 오늘 할 일로 잡히는 항목이 없어요. 읽지 못한 자료는 할 일로 판단하지 않았어요.</p>
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-[var(--lu-ink)]">확인된 지표</h3>
            <ul className="mt-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map(t => (
                <li key={t.key} className="min-w-0 rounded-[6px] border border-[var(--lu-line)] p-4">
                  <p className="text-sm font-medium text-[var(--lu-muted)]">{t.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--lu-ink)] tabular-nums">
                    {t.value === null ? (
                      <>-<span className="ml-2 text-sm font-medium text-[var(--lu-muted)]">{t.status || '측정 전'}</span></>
                    ) : (
                      <>{t.value}<span className="ml-1 text-sm font-medium">{t.unit}</span></>
                    )}
                  </p>
                  {t.value !== null && <ChangeLine text={t.change} kind={t.changeKind} />}
                  <p className="mt-2 break-words text-xs text-[var(--lu-muted)]">{t.meta}</p>
                </li>
              ))}
            </ul>
          </div>

          {data.sections.keywords === 'failed' ? (
            <p className="mt-5 text-xs text-[var(--lu-muted)]">등록 키워드 순위 : 조회 실패</p>
          ) : data.keywords.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[var(--lu-ink)]">등록 키워드 순위</h3>
              <div className="mt-2 overflow-x-auto rounded-[6px] border border-[var(--lu-line)]" role="region" aria-label="등록 키워드 순위 표" tabIndex={0}>
                <table className="w-full min-w-[520px] text-left text-sm">
                  <caption className="sr-only">키워드별 최근 순위, 지난 측정 대비 변화, 측정일</caption>
                  <thead className="bg-[var(--lu-canvas)]">
                    <tr>{['키워드', '최근 순위', '지난 측정 대비', '측정일'].map(h => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.keywords.map(k => (
                      <tr key={k.keywordTargetId} className="border-t border-[var(--lu-line)]">
                        <th scope="row" className="break-words px-3 py-3 font-semibold">{k.keyword}</th>
                        <td className="px-3 py-3 tabular-nums">{keywordValue(k)}</td>
                        <td className="px-3 py-3 tabular-nums">{k.changeText ?? '-'}</td>
                        <td className="px-3 py-3 text-xs">{fmtDate(k.measuredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[var(--lu-muted)]">출처 네이버 지도 검색 순위 수집 · 권외는 수집한 범위 안에 매장이 없었다는 뜻이에요.</p>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-[var(--lu-muted)]">
            읽은 시각 {fmtDate(data.read_at)} · 저장된 수집 기록 기준이며 지금 외부 매체를 다시 조회한 값이 아니에요.
            {data.hasPlaceTarget && checklistChecked === null ? ' 플레이스 점검표는 이 기기에서 읽지 못했어요.' : ''}
          </p>
        </>
      )}
    </section>
  )
}
