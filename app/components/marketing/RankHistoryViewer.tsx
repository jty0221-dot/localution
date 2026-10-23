'use client'
import { useMemo, useRef, useState } from 'react'
import { TrendingUp, Upload, Download } from 'lucide-react'
import TopNav from '../TopNav'
import Footer from '../Footer'
import PageHeader from '../PageHeader'
import { parseRankHistory, summarizeRankSeries, SAMPLE_RANK_HISTORY_JSON, type RankSeries, type RankPoint } from '../../lib/rank-history'
const button = 'min-h-[44px] rounded-xl border border-[#E5E8EB] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-[#3182F6]'
const inputStyle = 'min-h-[44px] w-full rounded-xl border border-[#E5E8EB] bg-white px-3 text-base focus:outline-[#3182F6]'
const statusLabel = { measured: '측정됨', unranked: '순위권 밖', missing: '측정값 없음' }
const display = (value: number | null) => value === null ? '확인 불가' : new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value)
const signed = (value: number | null) => value === null ? '비교 불가' : value > 0 ? `${display(value)} 증가` : value < 0 ? `${display(Math.abs(value))} 감소` : '변화 없음'
const csv = (value: string | number) => '"' + String(value).replace(/^(\s*[=+\-@]|[\t\r\n])/, "'$&").replace(/"/g, '""') + '"'
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function RankChart({ points }: { points: RankPoint[] }) {
  const measured = points.filter(point => point.status === 'measured' && point.rank !== null)
  if (!measured.length) return <p className="rounded-xl bg-[#F8F9FA] p-4 text-sm text-gray-600">선택한 기간에 측정된 순위가 없어요.</p>
  const maximum = Math.max(2, ...measured.map(point => point.rank!))
  const x = (index: number) => 50 + (points.length < 2 ? 250 : index / (points.length - 1) * 500)
  const y = (rank: number) => 30 + (rank - 1) / (maximum - 1) * 170
  const lines: string[] = []; let segment = ''
  points.forEach((point, index) => {
    const previous = points[index - 1]
    const calendarGap = previous && Date.parse(point.date) - Date.parse(previous.date) > 86400000
    if (point.status !== 'measured' || point.rank === null || calendarGap) { if (segment) lines.push(segment); segment = '' }
    if (point.status === 'measured' && point.rank !== null) segment += `${segment ? ' L' : 'M'}${x(index)},${y(point.rank)}`
  })
  if (segment) lines.push(segment)
  const ticks = Array.from(new Set([1, Math.ceil(maximum / 2), maximum]))
  return <div><svg viewBox="0 0 600 250" className="w-full" role="img" aria-label="날짜별 순위 차트. 작은 숫자가 위에 표시되며 측정값 없는 구간은 연결하지 않습니다."><title>날짜별 순위 변화</title>{ticks.map(tick => <g key={tick}><line x1="50" y1={y(tick)} x2="550" y2={y(tick)} stroke="#E5E8EB" /><text x="43" y={y(tick) + 4} textAnchor="end" fontSize="12" fill="#6B7280">{tick}위</text></g>)}{lines.map((path, index) => <path key={index} d={path} fill="none" stroke="#3182F6" strokeWidth="2" />)}{points.map((point, index) => point.status === 'measured' && point.rank !== null ? <circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.rank)} r="3.5" fill="#3182F6"><title>{point.date} · {point.rank}위</title></circle> : null)}<text x="50" y="230" fontSize="12" fill="#6B7280">{points[0]?.date}</text><text x="550" y="230" fontSize="12" textAnchor="end" fill="#6B7280">{points[points.length - 1]?.date}</text></svg><p className="text-xs leading-relaxed text-gray-500">숫자가 작을수록 높은 순위예요. 순위권 밖·측정값 없음과 날짜가 빠진 구간은 연결하지 않아요. 정확한 값은 아래 표에서 확인해 주세요.</p></div>
}
export default function RankHistoryViewer({ initialSeries = [] }: { initialSeries?: RankSeries[] }) {
  const [series, setSeries] = useState<RankSeries[]>(() => initialSeries)
  const [selected, setSelected] = useState(() => initialSeries[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [fileLabel, setFileLabel] = useState('')
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const matches = useMemo(() => series.filter(item => `${item.label} ${item.keyword}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [series, query])
  const active = matches.find(item => item.id === selected) ?? matches[0] ?? null
  const dateError = from && to && from > to ? '시작일은 종료일보다 늦을 수 없어요.' : ''
  const points = active && !dateError ? active.points.filter(point => (!from || point.date >= from) && (!to || point.date <= to)).slice().sort((a, b) => a.date.localeCompare(b.date)) : []
  const summary = active && !dateError ? summarizeRankSeries(active, from || undefined, to || undefined) : null
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  function apply(text: string, name: string, isDemo: boolean) {
    const result = parseRankHistory(text, name)
    if (result.errors.length || !result.series.length) { setError(result.errors.join(' ') || '분석할 수 있는 순위 이력이 없어요.'); setStatus('파일을 반영하지 않았어요. 기존 데이터는 유지했어요.'); return }
    setSeries(result.series); setSelected(result.series[0].id); setQuery(''); setFrom(''); setTo(''); setWarnings(result.warnings); setError(''); setFileLabel(name); setDemo(isDemo); setStatus(`${result.series.length}개 업체·키워드 이력을 불러왔어요.`)
  }
  async function upload(file?: File) {
    if (!file) return
    const ticket = ++generation.current
    if (file.size > 5 * 1024 * 1024) { setBusy(false); setError('파일은 5MB 이하로 선택해 주세요. 기존 데이터는 유지했어요.'); return }
    if (!/\.(json|tsv)$/i.test(file.name)) { setBusy(false); setError('JSON 또는 TSV 파일을 선택해 주세요. 기존 데이터는 유지했어요.'); return }
    setBusy(true)
    try { const text = await file.text(); if (ticket === generation.current) apply(text, file.name, false) }
    catch { if (ticket === generation.current) setError('파일을 읽지 못했어요. 기존 데이터는 유지했어요.') }
    finally { if (ticket === generation.current) setBusy(false); if (fileInput.current) fileInput.current.value = '' }
  }
  function exportCsv() {
    if (!active || !points.length || dateError) return
    const rows: (string | number)[][] = [['업체', '키워드', '출처', '측정일', '상태', '순위', '방문자 리뷰', '블로그 리뷰', '저장'], ...points.map(point => [active.label, active.keyword, active.source, point.date, statusLabel[point.status], point.rank ?? '', point.visitorReviews ?? '', point.blogReviews ?? '', point.saveText ?? point.saves ?? ''])]
    download('\uFEFF' + rows.map(row => row.map(csv).join(',')).join('\r\n'), '순위이력.csv', 'text/csv;charset=utf-8'); setStatus('현재 선택한 업체·키워드와 기간의 CSV 다운로드를 요청했어요.')
  }
  return <div className="min-h-screen bg-[#F8F9FA] text-[#191F28]"><TopNav /><main className="pt-16"><PageHeader icon={<TrendingUp size={28} aria-hidden="true" />} title="순위 이력 분석기" subtitle="순위 이력 파일을 넣고 날짜별 변화와 리뷰 증감을 확인해 보세요." badge="무료 분석 도구" /><div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6">
    <p className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">현재 순위를 검색하거나 실시간으로 수집하는 기능이 아니에요. 업로드한 파일 내용은 이 브라우저에서만 분석해요. 서버로 전송하거나 브라우저에 저장하지 않아요. 페이지를 닫거나 새로고침하면 사라져요.</p>
    <section className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6" aria-labelledby="upload-title"><div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm"><Upload size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" /></div><h2 id="upload-title" className="text-lg font-bold">이력 파일 가져오기</h2></div><label htmlFor="rank-file" className="mb-2 block text-sm font-semibold">JSON·TSV 파일 · 최대 5MB</label><input ref={fileInput} id="rank-file" type="file" accept=".json,.tsv,application/json,text/tab-separated-values" disabled={busy} onChange={event => upload(event.target.files?.[0])} className="block min-h-[44px] w-full min-w-0 text-base file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:text-sm file:text-blue-700" /><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} className={button} onClick={() => apply(SAMPLE_RANK_HISTORY_JSON, '익명 예시.json', true)}>익명 예시 불러오기</button><button type="button" className={button} onClick={() => download(SAMPLE_RANK_HISTORY_JSON, '순위이력_익명예시.json', 'application/json;charset=utf-8')}>예시 JSON 내려받기</button><button type="button" className={button} onClick={() => { generation.current++; setBusy(false); setSeries([]); setSelected(''); setQuery(''); setFrom(''); setTo(''); setError(''); setWarnings([]); setFileLabel(''); setDemo(false); setStatus('가져온 이력을 초기화했어요. 원본 파일은 그대로예요.'); if (fileInput.current) fileInput.current.value = '' }}>데이터 초기화</button></div>{busy && <p role="status" className="mt-3 text-sm">파일을 분석하고 있어요.</p>}{error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{warnings.length > 0 && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}<p role="status" aria-live="polite" className="mt-3 min-h-[24px] text-sm text-[#3182F6]">{status}</p></section>
    {!series.length ? <div className="rounded-2xl border border-[#E5E8EB] bg-white p-6 text-sm leading-relaxed text-gray-600">아직 가져온 이력이 없어요. 파일을 선택하거나 익명 예시로 먼저 살펴보세요.</div> : <>
      <section className="space-y-4 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6"><p className="break-words text-sm font-semibold">{demo ? '익명 예시 데이터 · 실제 매장 측정값이 아니에요' : '가져온 파일'} · {fileLabel}</p><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><label htmlFor="rank-search" className="mb-2 block text-sm font-semibold">업체·키워드 검색</label><input id="rank-search" type="search" value={query} onChange={event => setQuery(event.target.value)} className={inputStyle} /></div><div><label htmlFor="rank-select" className="mb-2 block text-sm font-semibold">업체·키워드 선택</label><select id="rank-select" value={active?.id ?? ''} onChange={event => setSelected(event.target.value)} className={inputStyle}>{!matches.length && <option value="">검색 결과 없음</option>}{matches.map(item => <option key={item.id} value={item.id}>{item.label} · {item.keyword}</option>)}</select></div><div><label htmlFor="rank-from" className="mb-2 block text-sm font-semibold">시작일</label><input id="rank-from" type="date" value={from} onChange={event => setFrom(event.target.value)} className={inputStyle} aria-invalid={!!dateError} /></div><div><label htmlFor="rank-to" className="mb-2 block text-sm font-semibold">종료일</label><input id="rank-to" type="date" value={to} onChange={event => setTo(event.target.value)} className={inputStyle} aria-invalid={!!dateError} /></div></div>{dateError && <p role="alert" className="text-sm text-red-600">{dateError}</p>}{active && <p className="break-words text-xs text-gray-600">출처: {active.source || '파일에 출처 없음'} · 측정일은 파일 안 날짜 기준이에요. 파일 이름이나 가져온 날짜와 다를 수 있어요.</p>}</section>
      {!active ? <p className="rounded-2xl bg-white p-6 text-sm">검색 조건에 맞는 업체·키워드가 없어요.</p> : dateError ? null : <>
        {summary?.lastMeasured && summary.lastMeasured.date < today && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">지난 측정 이력이에요. 선택 기간의 마지막 실제 측정일은 {summary.lastMeasured.date}이며 오늘 순위로 볼 수 없어요.</p>}
        {summary?.previous && summary.latest && <p className="text-sm text-gray-600">증감 비교일: {summary.previous.date} → {summary.latest.date}. 두 기록에 모두 정확한 값이 있을 때만 계산해요.</p>}
        <section aria-label="선택 기간 요약" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ['마지막 기록', summary?.latest ? `${summary.latest.date} · ${statusLabel[summary.latest.status]}${summary.latest.rank === null ? '' : ` · ${summary.latest.rank}위`}` : '기록 없음'],
          ['이전 기록 대비', summary?.delta === null || summary?.delta === undefined ? '비교 불가' : summary.delta > 0 ? `${summary.delta}위 상승` : summary.delta < 0 ? `${Math.abs(summary.delta)}위 하락` : '동일'],
          ['최고·최저 순위', `${display(summary?.best ?? null)} · ${display(summary?.worst ?? null)}`], ['평균 순위', display(summary?.average ?? null)],
          ['방문자 리뷰 증감', signed(summary?.visitorReviewDelta ?? null)], ['블로그 리뷰 증감', signed(summary?.blogReviewDelta ?? null)], ['저장 수 증감', signed(summary?.saveDelta ?? null)], ['기록 상태', `측정 ${summary?.measuredCount ?? 0}건 · 순위권 밖 ${summary?.unrankedCount ?? 0}건 · 없음 ${summary?.missingCount ?? 0}건`],
        ].map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm"><h2 className="text-xs text-gray-600">{label}</h2><p className="mt-2 break-words text-base font-bold tabular-nums">{value}</p></div>)}</section>
        <section className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6"><h2 className="mb-3 text-lg font-bold">날짜별 순위</h2><RankChart points={points} /><p className="mt-3 text-xs leading-relaxed text-gray-500">최고·최저·평균은 측정된 순위만 사용해요. 증감은 선택 기간의 비교 가능한 기록 기준이며, 순위 상승이 매출 상승을 의미하지는 않아요.</p></section>
        <section className="min-w-0 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">일자별 기록 · {points.length}건</h2><button type="button" disabled={!points.length} className={button} onClick={exportCsv}><Download size={16} className="mr-1 inline" aria-hidden="true" />선택 이력 CSV</button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><caption className="sr-only">선택한 업체·키워드의 기간 내 순위 및 리뷰 이력</caption><thead><tr className="border-b border-[#E5E8EB]">{['측정일', '상태', '순위', '방문자 리뷰', '블로그 리뷰', '저장'].map(label => <th key={label} scope="col" className="whitespace-nowrap p-3 font-semibold">{label}</th>)}</tr></thead><tbody>{points.map((point, index) => <tr key={`${point.date}-${index}`} className="border-b border-[#E5E8EB] last:border-0"><td className="whitespace-nowrap p-3">{point.date}</td><td className="whitespace-nowrap p-3">{statusLabel[point.status]}</td><td className="whitespace-nowrap p-3">{point.rank === null ? '해당 없음' : `${point.rank}위`}</td><td className="p-3">{display(point.visitorReviews)}</td><td className="p-3">{display(point.blogReviews)}</td><td className="p-3">{point.saveText || display(point.saves)}</td></tr>)}</tbody></table></div>{!points.length && <p className="p-4 text-sm text-gray-600">선택한 기간에 기록이 없어요.</p>}</section>
      </>}
    </>}
    <details className="rounded-2xl border border-[#E5E8EB] bg-white p-4 text-sm leading-relaxed shadow-sm md:p-6"><summary className="min-h-[44px] cursor-pointer font-semibold">지원하는 파일 양식</summary><p className="mt-3">JSON은 예시 파일처럼 series 목록 안에 label·keyword·points를 넣거나, groups 목록 안에 매장, 키워드, ranks를 넣어요. ranks의 dailyDate는 측정일, rank는 순위예요. visitantReviewCnt·blogReviewCnt·saveCnt로 리뷰와 저장 수를 넣을 수 있어요. 자세한 양식은 익명 예시 JSON을 내려받아 확인해 주세요.</p><p className="mt-2">TSV는 탭으로 구분한 표예요. 파일에서 측정값을 확인할 수 없는 항목은 확인 불가로 남겨요. 분석 전 본인이 사용할 권한이 있는 자료인지 확인해 주세요.</p></details>
  </div></main><Footer /></div>
}
