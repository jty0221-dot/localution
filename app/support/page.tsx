'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Search, ExternalLink, Building2, ArrowRight } from 'lucide-react'
import TopNav from '../components/TopNav'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { SUPPORT_DIRECTORY, SUPPORT_DIRECTORY_CHECKED_AT } from '../lib/support-directory'

type Program = { id: string; title: string; url: string; agency: string; category: string; target: string; period: string; summary: string; tags: string[]; publishedAt: string | null }
type Result = { items: Program[]; fetchedAt: string | null; source: string; coverage: string; mode: string }
const regions = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const fields = ['전체', '금융', '기술', '인력', '수출', '내수', '창업', '경영', '기타']
const control = 'min-h-11 w-full rounded-md border border-[var(--lu-line)] bg-white px-3 py-2 text-base leading-6'
function safeUrl(value: string) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null } catch { return null } }
export default function SupportPage() {
 const [draft, setDraft] = useState({ region: '전체', field: '전체', q: '' })
 const [query, setQuery] = useState({ region: '전체', field: '전체', q: '', revision: 0 })
 const [loading, setLoading] = useState(true)
 const [result, setResult] = useState<Result | null>(null)
 const [state, setState] = useState<'ready' | 'not_configured' | 'filters_require_connection' | 'error'>('ready')
 const [message, setMessage] = useState('')
 const request = useRef(0)
 useEffect(() => {
  const controller = new AbortController(), generation = ++request.current
  const params = new URLSearchParams()
  if (query.region !== '전체') params.set('region', query.region)
  if (query.field !== '전체') params.set('field', query.field)
  if (query.q.trim()) params.set('q', query.q.trim())
  setLoading(true); setResult(null); setState('ready'); setMessage('')
  ;(async () => {
   try {
    const response = await fetch(`/api/support-programs?${params}`, { signal: controller.signal, cache: 'no-store' })
    const body = await response.json().catch(() => null)
    if (controller.signal.aborted || generation !== request.current) return
    if (response.status === 503 && body?.code === 'not_configured') { setState('not_configured'); return }
    if (response.status === 503 && body?.code === 'filters_require_connection') { setState('filters_require_connection'); return }
    if (!response.ok || body?.ok !== true || !Array.isArray(body.items)) throw new Error('공고를 불러오지 못했습니다. 잠시 후 다시 확인하거나 공식 사이트에서 확인해주세요.')
    const valid = body.items.every((item: Program) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string' && Array.isArray(item.tags))
    if (!valid) throw new Error('공고 응답 형식을 확인하지 못했습니다. 공식 공고를 확인해주세요.')
    setResult({ items: body.items, fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : null, source: typeof body.source === 'string' ? body.source : '공식 출처', coverage: typeof body.coverage === 'string' ? body.coverage : '이번에 받아온 공식 공고 안에서 검색한 결과입니다.', mode: typeof body.mode === 'string' ? body.mode : '' })
   } catch (error) {
    if (controller.signal.aborted || generation !== request.current) return
    setState('error'); setMessage(error instanceof Error ? error.message : '공고를 확인하지 못했습니다.')
   } finally { if (!controller.signal.aborted && generation === request.current) setLoading(false) }
  })()
  return () => controller.abort()
 }, [query])
 function search(event: FormEvent) { event.preventDefault(); setQuery({ ...draft, q: draft.q.trim(), revision: query.revision + 1 }) }
 return <div className="min-h-screen bg-[var(--lu-canvas)] pt-16">
  <TopNav /><PageHeader title="소상공인 지원정보" subtitle="기관에서 발표한 실제 사업공고를 확인하고, 내 매장에 필요한 지원을 찾아보세요." icon={<Building2 size={20} />} badge="공식 출처 안내" />
  <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-8">
   <section aria-labelledby="support-search-title" className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6">
    <h2 id="support-search-title" className="text-xl font-semibold">지원사업 공고 찾기</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">공식 출처의 최근 사업공고를 불러옵니다. 아래에 표시된 조회 범위 안에서 검색하며, 신청 자격·기간·변경 사항은 원문에서 확인해주세요.</p>
    {result?.mode === 'official_rss' && <p className="mt-3 rounded-md bg-[var(--lu-accent-soft)] p-3 text-sm leading-6">중소벤처기업부 최근 공고가 연결되어 있어요. 제목 검색을 이용할 수 있으며, 지역·분야별 검색은 기관 연결을 확대하는 중이에요.</p>}
    <form onSubmit={search} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_2fr_auto]">
     <label className="space-y-2 text-xs font-semibold">지역<select className={control} value={draft.region} onChange={e => setDraft({ ...draft, region: e.target.value })}>{regions.map(value => <option key={value}>{value}</option>)}</select></label>
     <label className="space-y-2 text-xs font-semibold">분야<select className={control} value={draft.field} onChange={e => setDraft({ ...draft, field: e.target.value })}>{fields.map(value => <option key={value}>{value}</option>)}</select></label>
     <label className="space-y-2 text-xs font-semibold">검색어<input className={control} value={draft.q} maxLength={80} onChange={e => setDraft({ ...draft, q: e.target.value })} placeholder="찾고 싶은 지원사업" /></label>
     <button type="submit" disabled={loading} className="lu-primary inline-flex min-h-11 items-center justify-center gap-2 self-end disabled:opacity-60"><Search size={17} />{loading ? '확인 중' : '공고 조회'}</button>
    </form>
    <div className="mt-5" aria-live="polite" aria-busy={loading}>
     {loading ? <p className="text-sm text-[var(--lu-muted)]">공식 공고를 확인하고 있습니다.</p> : state === 'filters_require_connection' ? <div className="rounded-md border border-[var(--lu-line)] bg-[var(--lu-canvas)] p-4"><h3 className="font-semibold">지역·분야별 조회 연결이 필요해요</h3><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">현재 연결된 중소벤처기업부 공고에는 지역·분야 정보가 제공되지 않아요. 전체 공고로 돌아가 제목을 검색하거나 기관 원문에서 조건을 확인해주세요.</p><button type="button" onClick={() => { setDraft({ region: '전체', field: '전체', q: query.q }); setQuery({ region: '전체', field: '전체', q: query.q, revision: query.revision + 1 }) }} className="lu-primary mt-3 min-h-11">전체 공고 보기</button></div> : state === 'not_configured' ? <div className="rounded-md border border-[var(--lu-line)] bg-[var(--lu-canvas)] p-4"><h3 className="font-semibold">최신 공고 자동 불러오기 연결 준비 중</h3><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">현재 자동 조회가 연결되지 않았습니다. 공고가 없는 상태를 뜻하지 않습니다. 아래 공식 공고 바로가기를 이용해주세요.</p><a href={SUPPORT_DIRECTORY[0].href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">공식 공고 보기<ExternalLink size={15} /></a></div> : state === 'error' ? <p role="alert" className="rounded-md bg-[var(--lu-danger-soft)] p-4 text-sm leading-6 text-[var(--lu-danger)]">{message}</p> : result ? <p className="text-xs leading-5 text-[var(--lu-muted)]">출처 {result.source} · 이번 조회에서 확인한 {result.items.length}건 · 조회 시각 {result.fetchedAt ? new Date(result.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '확인 필요'} (한국시간)<br />{result.coverage}<br />적용 조건: {query.region} · {query.field} · {query.q || '검색어 전체'}</p> : null}
    </div>
   </section>
   {!loading && state === 'ready' && result && <section aria-label="지원사업 공고 목록" className="space-y-4">
    {result.items.length === 0 ? <p className="rounded-[10px] border border-[var(--lu-line)] bg-white p-6 text-sm leading-6 text-[var(--lu-muted)]">이번 조회에서 조건에 맞는 공고를 확인하지 못했습니다. 지역·분야·검색어를 바꾸거나 공식 사이트를 확인해주세요.</p> : result.items.map(item => { const href = safeUrl(item.url); return <article key={item.id} className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6"><p className="text-xs text-[var(--lu-muted)]">{item.agency || '기관 원문 확인'} · {item.category || '분야 원문 확인'}</p><h2 className="mt-2 break-keep text-lg font-semibold">{item.title}</h2><dl className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2"><div><dt className="text-xs text-[var(--lu-muted)]">지원 대상</dt><dd>{item.target || '원문에서 확인해주세요.'}</dd></div><div><dt className="text-xs text-[var(--lu-muted)]">신청 기간</dt><dd>{item.period || '원문에서 확인해주세요.'}</dd></div></dl>{item.summary && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lu-muted)]">{item.summary}</p>}{item.publishedAt && <p className="mt-3 text-xs text-[var(--lu-muted)]">발표일 {item.publishedAt}</p>}{item.tags.length > 0 && <p className="mt-3 break-words text-xs leading-5 text-[var(--lu-muted)]">{item.tags.join(' · ')}</p>}{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">공고 원문 확인<ExternalLink size={15} /></a> : <p className="mt-4 text-sm text-[var(--lu-muted)]">원문 주소를 확인하지 못했습니다. 공식 사이트에서 공고명을 검색해주세요.</p>}</article> })}
   </section>}
   <section aria-labelledby="official-directory-title"><h2 id="official-directory-title" className="text-xl font-semibold">공식 공고 바로가기</h2><p className="mt-2 text-xs leading-5 text-[var(--lu-muted)]">공식 사이트 확인일 {SUPPORT_DIRECTORY_CHECKED_AT}. 아래는 기관별 원문 바로가기이며 위 검색 조건은 적용되지 않습니다. 각 사이트에서 최신 대상·기간·신청 조건을 확인하세요.</p><div className="mt-4 grid gap-4 md:grid-cols-3">{SUPPORT_DIRECTORY.filter(item => item.group === 'support').map(item => <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="rounded-[10px] border border-[var(--lu-line)] bg-white p-5"><span className="flex min-h-11 items-center justify-between gap-3 font-semibold">{item.title}<ExternalLink size={16} /></span><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">{item.description}</p></a>)}</div></section>
   <aside className="border-t border-[var(--lu-line)] pt-6"><h2 className="text-base font-semibold">제휴·광고 안내</h2><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">지원 공고와 제휴·광고는 구분해서 안내합니다. 현재 이 영역에 게시된 광고는 없습니다.</p><Link href="/partners" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">제휴 방식과 준비사항 보기<ArrowRight size={16} /></Link></aside>
  </main><Footer />
 </div>
}
