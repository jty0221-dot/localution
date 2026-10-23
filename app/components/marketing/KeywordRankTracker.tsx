'use client'
// /marketing/keyword-rank · 내 플레이스 키워드 순위 추적 (실측)
// 데이터: /api/place/targets (내 매장) · /api/place/keywords (등록 · 삭제 · 최신값) · /api/place/keyword-history (30일) · /api/place/keyword-rank (지금 측정)
// 원칙: 순위는 측정값 그대로 · 측정 시각 표시 · 권외와 측정 전을 0위로 그리지 않는다 · 점수는 네이버 원점수가 없어 비워 둔다.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LogIn, Plus, RefreshCw, Trash2, Store, Info } from 'lucide-react'
import { dailySeries, formatSeoulTime, rankState, rankStateLabel, summarize, type DayPoint, type RankRow } from '../../lib/keyword-rank-view'

type Target = { id: string; name: string | null; place_id: string }
type KeywordRow = {
  id: string
  target_id: string
  keyword: string
  enabled: boolean
  latest: { rank: number | null; total: number | null; method: string | null; ts: string } | null
}
type HistoryRow = RankRow & { keyword_target_id: string }
type Phase = 'loading' | 'guest' | 'ready' | 'error'

const DAYS = 30
const button = 'inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] border border-[var(--lu-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--lu-ink)] hover:bg-[var(--lu-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lu-accent)] disabled:cursor-not-allowed disabled:opacity-40'
const primary = 'inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] bg-[var(--lu-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lu-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)] disabled:cursor-not-allowed disabled:opacity-50'

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try { return (await res.json()) as Record<string, unknown> } catch { return {} }
}

export default function KeywordRankTracker() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [targets, setTargets] = useState<Target[]>([])
  const [targetId, setTargetId] = useState('')
  const [keywords, setKeywords] = useState<KeywordRow[]>([])
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({})
  const [limit, setLimit] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/place/targets', { cache: 'no-store' })
        if (!alive) return
        if (res.status === 401) { setPhase('guest'); return }
        const data = await readJson(res)
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : '매장 목록을 불러오지 못했어요.')
        const list = (Array.isArray(data.targets) ? data.targets : []) as Target[]
        setTargets(list)
        setTargetId(list[0]?.id ?? '')
        setPhase('ready')
      } catch (reason) {
        if (!alive) return
        setError(reason instanceof Error ? reason.message : '매장 목록을 불러오지 못했어요.')
        setPhase('error')
      }
    })()
    return () => { alive = false }
  }, [])

  const load = useCallback(async (id: string) => {
    if (!id) { setKeywords([]); setHistory({}); return }
    setBusy('load'); setError('')
    try {
      const [kRes, hRes] = await Promise.all([
        fetch('/api/place/keywords?' + new URLSearchParams({ target_id: id }), { cache: 'no-store' }),
        fetch('/api/place/keyword-history?' + new URLSearchParams({ target_id: id, days: String(DAYS) }), { cache: 'no-store' }),
      ])
      const k = await readJson(kRes)
      if (!kRes.ok || k.ok !== true) throw new Error(typeof k.error === 'string' ? k.error : '키워드를 불러오지 못했어요.')
      setKeywords((Array.isArray(k.keywords) ? k.keywords : []) as KeywordRow[])
      setLimit(typeof k.limit === 'number' ? k.limit : null)
      const h = await readJson(hRes)
      setHistory(hRes.ok && h.ok === true && h.by_keyword && typeof h.by_keyword === 'object' ? (h.by_keyword as Record<string, HistoryRow[]>) : {})
      if (!hRes.ok) setStatus('추이 기록을 불러오지 못했어요. 최신 순위만 보여드려요.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '키워드를 불러오지 못했어요.')
    } finally { setBusy(null) }
  }, [])

  useEffect(() => { if (phase === 'ready') load(targetId) }, [phase, targetId, load])

  async function add(event: FormEvent) {
    event.preventDefault()
    const keyword = draft.trim().replace(/\s+/g, ' ')
    if (!targetId || busy) return
    if (keyword.length < 2 || keyword.length > 40) { setError('키워드는 2~40자로 입력해 주세요.'); return }
    setBusy('add'); setError(''); setStatus('')
    try {
      const res = await fetch('/api/place/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_id: targetId, keyword }) })
      const data = await readJson(res)
      if (res.status === 401) { setPhase('guest'); return }
      if (!res.ok || data.ok !== true) throw new Error(typeof data.error === 'string' ? data.error : '키워드를 등록하지 못했어요.')
      setDraft('')
      setStatus(`'${keyword}' 을 등록했어요. 매일 아침 자동 측정 목록에 들어가요. 바로 보려면 지금 측정을 눌러 주세요.`)
      await load(targetId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '키워드를 등록하지 못했어요.')
    } finally { setBusy(null) }
  }

  async function remove(row: KeywordRow) {
    if (busy) return
    if (!window.confirm(`'${row.keyword}' 추적을 그만할까요? 이 키워드의 순위 기록도 함께 지워져요.`)) return
    setBusy('del:' + row.id); setError(''); setStatus('')
    try {
      const res = await fetch('/api/place/keywords?' + new URLSearchParams({ id: row.id }), { method: 'DELETE' })
      const data = await readJson(res)
      if (!res.ok || data.ok !== true) throw new Error(typeof data.error === 'string' ? data.error : '삭제하지 못했어요.')
      setStatus(`'${row.keyword}' 추적을 그만했어요.`)
      await load(targetId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '삭제하지 못했어요.')
    } finally { setBusy(null) }
  }

  async function measure(row: KeywordRow) {
    if (busy) return
    setBusy('measure:' + row.id); setError(''); setStatus('')
    try {
      const res = await fetch('/api/place/keyword-rank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword_target_id: row.id }) })
      const data = await readJson(res)
      if (res.status === 429) throw new Error(typeof data.message === 'string' ? data.message : '잠시 후 다시 시도해 주세요.')
      if (!res.ok || data.ok !== true) throw new Error('지금은 순위를 가져오지 못했어요. 이번 시도는 기록하지 않았어요. 잠시 뒤 다시 시도해 주세요.')
      setStatus(`'${row.keyword}' 을 방금 측정했어요.`)
      await load(targetId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '측정하지 못했어요.')
    } finally { setBusy(null) }
  }

  if (phase === 'loading') return <div role="status" className="max-w-4xl rounded-[10px] border border-[var(--lu-line)] bg-white p-6 text-sm text-[var(--lu-muted)]">로그인 상태와 매장 목록을 확인하고 있어요.</div>
  if (phase === 'guest') return <GuestExample />
  if (phase === 'error') return <div role="alert" className="max-w-4xl rounded-[10px] border border-[var(--lu-danger)] bg-[var(--lu-danger-soft)] p-4 text-sm leading-relaxed text-[var(--lu-danger)]">{error}<p className="mt-2 text-[var(--lu-ink)]">새로고침하거나 잠시 뒤 다시 열어 주세요.</p></div>

  if (!targets.length) return <section className="max-w-4xl rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6">
    <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)]"><Store size={18} className="text-[var(--lu-accent)]" aria-hidden="true" /></div><h2 className="text-lg font-bold">먼저 내 플레이스를 등록해 주세요</h2></div>
    <p className="mt-3 text-sm leading-relaxed text-[var(--lu-muted)]">추적할 매장이 아직 없어요. 플레이스 관리에서 내 매장 주소를 한 번 등록하면, 이 화면에서 키워드를 붙여 매일 순위를 기록할 수 있어요.</p>
    <Link href="/marketing/place" className={primary + ' mt-4'}>플레이스 등록하러 가기</Link>
  </section>

  const activeCount = keywords.filter(k => k.enabled).length
  const full = limit !== null && activeCount >= limit

  return <section aria-labelledby="tracker-title" className="max-w-4xl space-y-4">
    <div className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6">
      <h2 id="tracker-title" className="text-lg font-bold">내 플레이스 키워드 순위</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--lu-muted)]">등록한 키워드는 매일 아침 6시쯤 자동으로 측정해 기록해요. 대상이 많은 날은 일부가 다음 측정으로 넘어갈 수 있어요. 측정에 실패한 날은 기록을 남기지 않고 빈칸으로 둬요.</p>
      {targets.length > 1 && <label className="mt-4 block text-sm font-semibold">매장 선택<select value={targetId} onChange={e => { setTargetId(e.target.value); setStatus(''); setError('') }} className="mt-2 block min-h-[44px] w-full rounded-[6px] border border-[var(--lu-line)] bg-white px-3 text-base md:w-80">{targets.map(t => <option key={t.id} value={t.id}>{t.name || '이름 없는 매장'} · {t.place_id}</option>)}</select></label>}
      {targets.length === 1 && <p className="mt-4 text-sm"><span className="font-semibold">{targets[0].name || '내 매장'}</span> <span className="text-[var(--lu-muted)]">· 플레이스 ID {targets[0].place_id}</span></p>}
      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="kr-new">추적할 키워드</label>
        <input id="kr-new" value={draft} onChange={e => setDraft(e.target.value)} maxLength={40} placeholder="예: ○○동 카페" disabled={full} className="min-h-[44px] w-full rounded-[6px] border border-[var(--lu-line)] px-3 text-base focus:outline-[var(--lu-accent)] sm:flex-1" />
        <button type="submit" disabled={!!busy || full || draft.trim().length < 2} className={primary}><Plus size={16} aria-hidden="true" />키워드 추가</button>
      </form>
      <p className="mt-2 text-xs text-[var(--lu-muted)]">2~40자 · 계정당 최대 {limit ?? 50}개{limit !== null && ` · 지금 ${activeCount}개 사용 중`}{full && ' · 상한에 닿아 더 추가할 수 없어요'}</p>
    </div>

    <p role="status" aria-live="polite" className="min-h-[20px] text-sm text-[var(--lu-accent)]">{status}</p>
    {error && <div role="alert" className="rounded-[10px] border border-[var(--lu-danger)] bg-[var(--lu-danger-soft)] p-4 text-sm leading-relaxed text-[var(--lu-danger)]">{error}</div>}

    {busy === 'load' && !keywords.length ? <div role="status" className="rounded-[10px] bg-white p-6 text-sm text-[var(--lu-muted)]">순위 기록을 불러오고 있어요.</div>
      : !keywords.length ? <div className="rounded-[10px] border border-dashed border-[var(--lu-line)] bg-white p-6 text-sm leading-relaxed text-[var(--lu-muted)]">아직 등록한 키워드가 없어요. 손님이 실제로 검색할 만한 말(동네 이름 + 업종)을 위에 넣어 보세요. 등록한 날부터 기록이 쌓여요.</div>
      : <ul className="space-y-3">{keywords.map(row => <KeywordCard key={row.id} row={row} rows={history[row.id] ?? []} busy={busy} onMeasure={() => measure(row)} onRemove={() => remove(row)} />)}</ul>}

    <ScoreNote />
  </section>
}

function KeywordCard({ row, rows, busy, onMeasure, onRemove }: { row: KeywordRow; rows: HistoryRow[]; busy: string | null; onMeasure: () => void; onRemove: () => void }) {
  const state = rankState(row.latest)
  const points = useMemo(() => dailySeries(rows, DAYS), [rows])
  return <li className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="break-words text-base font-bold">{row.keyword}{!row.enabled && <span className="ml-2 rounded-[4px] bg-[var(--lu-canvas)] px-1.5 py-0.5 text-xs font-semibold text-[var(--lu-muted)]">측정 중지</span>}</h3>
        <RankLine state={state} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onMeasure} disabled={!!busy} className={button}><RefreshCw size={15} aria-hidden="true" className={busy === 'measure:' + row.id ? 'animate-spin motion-reduce:animate-none' : ''} />{busy === 'measure:' + row.id ? '측정 중' : '지금 측정'}</button>
        <button type="button" onClick={onRemove} disabled={!!busy} className={button} aria-label={`${row.keyword} 추적 그만하기`}><Trash2 size={15} aria-hidden="true" />삭제</button>
      </div>
    </div>
    <TrendChart points={points} />
  </li>
}

function RankLine({ state }: { state: ReturnType<typeof rankState> }) {
  return <div className="mt-2">
    <p className={`text-heading1 font-bold tabular-nums ${state.kind === 'ranked' ? 'text-[var(--lu-ink)]' : 'text-[var(--lu-muted)]'}`}>{rankStateLabel(state)}</p>
    <p className="mt-1 text-xs text-[var(--lu-muted)]">{state.kind === 'never' ? '등록 후 첫 측정을 기다리고 있어요' : `${formatSeoulTime(state.ts)} 측정${state.total ? ` · 확인한 목록 ${state.total}개` : ''}`} · 네이버 점수 칸은 비워 둬요</p>
  </div>
}

function TrendChart({ points, example = false }: { points: DayPoint[]; example?: boolean }) {
  const sum = summarize(points)
  const data = points.map(p => ({ day: p.day.slice(5).replace('-', '/'), rank: p.rank, measured: p.measured, outside: p.outside }))
  const hasLine = sum.best !== null
  const top = hasLine ? Math.max(1, (sum.best as number) - 1) : 1
  const bottom = hasLine ? (sum.worst as number) + 1 : 10
  return <div className="mt-4">
    <p className="text-xs font-semibold text-[var(--lu-muted)]">최근 {points.length}일 추이 {example ? '(예시)' : ''} · 위로 갈수록 상위</p>
    {sum.measuredDays === 0 ? <p className="mt-2 rounded-[6px] bg-[var(--lu-canvas)] p-3 text-sm text-[var(--lu-muted)]">최근 {points.length}일 안에 측정 기록이 없어요.</p>
      : <div className="mt-2 h-28 w-full" role="img" aria-label={`최근 ${points.length}일 중 ${sum.measuredDays}일 측정. ${hasLine ? `가장 높은 순위 ${sum.best}위, 가장 낮은 순위 ${sum.worst}위.` : '측정한 날 모두 미노출.'} 미노출 ${sum.outsideDays}일.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#53656A' }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: '#D5DEDC' }} minTickGap={24} />
            <YAxis reversed allowDecimals={false} domain={[top, bottom]} tick={{ fontSize: 11, fill: '#53656A' }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as { day: string; rank: number | null; measured: boolean; outside: boolean }
              return <div className="rounded-[6px] border border-[var(--lu-line)] bg-white px-2 py-1 text-xs shadow-[var(--lu-shadow-overlay)]">{p.day} · {!p.measured ? '기록 없음' : p.outside ? '미노출 (권외)' : `${p.rank}위`}</div>
            }} />
            <Line type="linear" dataKey="rank" stroke="#16685D" strokeWidth={2} dot={{ r: 2.5, fill: '#16685D' }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>}
    <p className="mt-1 text-xs tabular-nums text-[var(--lu-muted)]">측정 {sum.measuredDays}일{hasLine ? ` · 최고 ${sum.best}위 · 최저 ${sum.worst}위` : ''} · 미노출 {sum.outsideDays}일 · 기록 없음 {points.length - sum.measuredDays}일 (선이 끊긴 곳은 미노출이거나 기록이 없는 날)</p>
  </div>
}

function ScoreNote() {
  return <div className="flex gap-2 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 text-xs leading-relaxed text-[var(--lu-muted)]"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><p>순위는 측정한 지도 검색 목록에서 내 플레이스 ID가 몇 번째에 있었는지예요. 목록 밖이면 미노출로 적고 0위로 그리지 않아요. 네이버가 정렬 점수를 공개하지 않아 점수 · 등급은 만들지 않고 비워 둬요. 검색하는 위치 · 시간 · 기기에 따라 실제 화면 순서와 다를 수 있어요.</p></div>
}

// 비로그인 방문자용 예시. 업체와 순위는 가상이며 서버를 부르지 않는다.
const EXAMPLE_NOW = new Date('2026-10-23T03:00:00Z')
function exampleRows(pattern: (number | null | undefined)[]): RankRow[] {
  const rows: RankRow[] = []
  pattern.forEach((rank, i) => {
    if (rank === undefined) return
    const ts = new Date(EXAMPLE_NOW.getTime() - (pattern.length - 1 - i) * 86400000).toISOString()
    rows.push({ rank, total: 100, method: 'map_api', ts })
  })
  return rows
}
const EXAMPLES: { keyword: string; rows: RankRow[] }[] = [
  { keyword: '○○동 카페', rows: exampleRows([14, 14, 13, undefined, 12, 12, 11, 11, 10, 11, 10, 9, 9, undefined, 9, 8, 8, 8, 7, 8, 7, 7, 6, 7, 6, 6, undefined, 6, 5, 5]) },
  { keyword: '○○역 디저트', rows: exampleRows([null, null, null, 48, 45, null, 41, 40, 38, 37, undefined, 36, 33, 31, 30, 30, 29, 27, 27, 26, 24, 24, 23, 22, 22, 21, 21, 20, 19, 19]) },
]

function GuestExample() {
  return <section aria-labelledby="example-title" className="max-w-4xl space-y-3">
    <div className="rounded-[10px] border border-[var(--lu-warning)] bg-[var(--lu-warning-soft)] p-4 text-sm leading-relaxed text-[var(--lu-ink)]">
      <p id="example-title" className="font-bold">예시 화면이에요 · 업체와 순위는 가상</p>
      <p className="mt-1">로그인하면 내 플레이스에 키워드를 등록하고, 매일 측정한 실제 순위와 측정 시각, 최근 30일 추이를 이 자리에서 볼 수 있어요.</p>
      <Link href="/login?redirect=/marketing/keyword-rank" className={primary + ' mt-3'}><LogIn size={16} aria-hidden="true" />로그인하고 내 순위 보기</Link>
    </div>
    <ul className="space-y-3" aria-label="예시 키워드">
      {EXAMPLES.map(ex => {
        const last = ex.rows[ex.rows.length - 1]
        return <li key={ex.keyword} className="rounded-[10px] border border-dashed border-[var(--lu-line)] bg-white p-4 md:p-5">
          <h3 className="text-base font-bold">{ex.keyword} <span className="ml-1 rounded-[4px] bg-[var(--lu-canvas)] px-1.5 py-0.5 text-xs font-semibold text-[var(--lu-muted)]">예시</span></h3>
          <p className="mt-2 text-heading1 font-bold tabular-nums">{rankStateLabel(rankState(last))}</p>
          <p className="mt-1 text-xs text-[var(--lu-muted)]">예시 측정 시각 · 네이버 점수 칸은 비워 둬요</p>
          <TrendChart points={dailySeries(ex.rows, DAYS, EXAMPLE_NOW)} example />
        </li>
      })}
    </ul>
    <ScoreNote />
  </section>
}
