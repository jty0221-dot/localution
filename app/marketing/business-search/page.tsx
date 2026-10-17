'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Search, ExternalLink, ArrowRight } from 'lucide-react'
import TopNav from '../../components/TopNav'
import Footer from '../../components/Footer'
import { ToolNavigation, ToolNextSteps } from '../../components/marketing/ToolWorkflow'
import { BUSINESS_INDUSTRIES, BUSINESS_SEARCH_MODES, type SearchProvider, type BusinessSearchResult, type SearchConnections } from '../../lib/business-search'

export default function BusinessSearchPage() {
 const [provider, setProvider] = useState<SearchProvider>('naver')
 const [mode, setMode] = useState('local')
 const [industry, setIndustry] = useState('food')
 const [region, setRegion] = useState('')
 const [keyword, setKeyword] = useState('')
 const [providers, setProviders] = useState<SearchConnections | null>(null)
 const [availabilityError, setAvailabilityError] = useState(false)
 const [checkingProviders, setCheckingProviders] = useState(false)
 const availabilityBusy = useRef(false)
 const [loading, setLoading] = useState(false)
 const busy = useRef(false)
 const keywordInput = useRef<HTMLInputElement>(null)
 const [error, setError] = useState<string | null>(null)
 const [loginRequired, setLoginRequired] = useState(false)
 const [result, setResult] = useState<BusinessSearchResult | null>(null)
 async function checkProviders() {
 if (availabilityBusy.current) return
 availabilityBusy.current = true
 setCheckingProviders(true)
 setAvailabilityError(false)
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), 10000)
 try {
 const response = await fetch('/api/marketing/business-search', { cache: 'no-store', signal: controller.signal })
 const data = await response.json()
 if (!response.ok || !data.ok || typeof data.providers?.naver?.local !== 'boolean' || typeof data.providers?.google?.local !== 'boolean') throw new Error()
 setProviders(data.providers)
 } catch { setProviders(null); setAvailabilityError(true) }
 finally { clearTimeout(timer); availabilityBusy.current = false; setCheckingProviders(false) }
 }
 useEffect(() => { void checkProviders() }, [])
 async function search(event: FormEvent) {
 event.preventDefault()
 if (busy.current) return
 busy.current = true
 setLoading(true); setError(null); setLoginRequired(false); setResult(null)
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), 15000)
 try {
 const response = await fetch('/api/marketing/business-search', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ provider, mode, industry, region, keyword }), signal: controller.signal,
 })
 const data = await response.json()
 if (!response.ok || !data.ok) {
 setLoginRequired(response.status === 401)
 setError(data.error || '검색을 완료하지 못했어요. 다시 검색해보세요.')
 return
 }
 setResult(data)
 } catch { setError(controller.signal.aborted ? '검색 대기 시간이 길어졌어요. 다시 검색해보세요.' : '검색에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 검색해보세요.') }
 finally { clearTimeout(timer); busy.current = false; setLoading(false) }
 }
 const keywordExamples: Record<string, string[]> = {
 food: ['카페', '한식당'], service: ['미용실', '입주청소'], education: ['영어학원', '미술학원'],
 retail: ['공방', '생활용품'], agency: ['매장 홍보', '블로그 주제'],
 }
 const examples = keywordExamples[industry]
 const inputClass = 'mt-2 min-h-[44px] w-full rounded-[6px] border border-[var(--lu-line)] bg-white px-3 py-2.5 text-base text-[var(--lu-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--lu-accent)]'
 return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]">
 <TopNav />
 <main className="mx-auto max-w-4xl px-4 pb-12 pt-24 md:px-6">
 <ToolNavigation />
 <div className="mb-7 flex items-start gap-3">
 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><Search size={22} className="text-[var(--lu-accent)]" strokeWidth={1.8} /></span>
 <div><h1 className="text-xl font-black md:text-2xl">매장·콘텐츠 검색</h1><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">주변 매장을 살펴보거나 블로그와 카페 글의 주제를 찾아보세요. 결과의 출처를 직접 확인한 뒤 내 사업에 맞게 활용하면 돼요.</p></div>
 </div>
 <section aria-labelledby="scope-title" className="mb-5 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6">
 <h2 id="scope-title" className="font-semibold">어디까지 검색하나요?</h2>
 <p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">매장 찾기는 네이버 지역 검색과 Google Maps 매장 검색 중에서 선택해요. 블로그와 카페 글은 네이버의 공개 검색 결과를 참고해요. 검색 결과는 제공 범위에 따라 달라지며, 영업 여부와 작성일은 출처에서 확인해보세요.</p>
 <p className="mt-2 text-xs leading-5 text-[var(--lu-muted)]">업종은 다음 작업에 맞는 도구 안내에 쓰이고, 실제 검색에는 입력한 지역과 검색어를 함께 사용해요. 검색 실행에는 로그인이 필요해요.</p>
 </section>
 <form onSubmit={search} className="space-y-4 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <label className="text-sm font-semibold">내 업종<select value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>{BUSINESS_INDUSTRIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
 <label className="text-sm font-semibold">검색할 내용<select value={mode} onChange={e => { setMode(e.target.value); if (e.target.value !== 'local') setProvider('naver') }} className={inputClass}>{BUSINESS_SEARCH_MODES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
 <label className="text-sm font-semibold">지역<input required maxLength={40} value={region} onChange={e => setRegion(e.target.value)} placeholder="예: 부천 중동" className={inputClass} /></label>
 <label className="text-sm font-semibold">검색어<input ref={keywordInput} required minLength={2} maxLength={80} value={keyword} onChange={e => setKeyword(e.target.value)} placeholder={'예: ' + examples.join(' 또는 ')} className={inputClass} /></label>
 </div>
 <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[var(--lu-muted)]">검색어 예시</span>{examples.map(example => <button key={example} type="button" onClick={() => setKeyword(example)} className="min-h-[44px] rounded-[6px] border border-[var(--lu-line)] px-3 py-2 text-sm text-[var(--lu-muted)] hover:border-[var(--lu-accent)] hover:text-[var(--lu-accent)]">{example}</button>)}</div>
 <label className="block text-sm font-semibold">검색 서비스<select value={provider} onChange={e => setProvider(e.target.value as SearchProvider)} className={inputClass}><option value="naver">네이버</option>{mode === 'local' && <option value="google">Google Maps 매장 검색</option>}</select></label>
 <div role="status" className="text-sm leading-6 text-[var(--lu-muted)]">{providers ? `${provider === 'naver' ? '네이버' : 'Google Maps'}: ${providers[provider][mode as 'local' | 'blog' | 'cafe'] ? '연결 설정 있음. 실제 조회 성공 여부는 검색 후 확인해요.' : '연결 준비 필요. 관리자가 기존 검색 연결을 확인해야 해요.'}` : availabilityError ? '연결 설정을 확인하지 못했어요.' : '연결 설정을 확인하고 있어요.'}<button type="button" onClick={checkProviders} disabled={checkingProviders} className="ml-2 min-h-[44px] font-semibold text-[var(--lu-accent)] underline disabled:opacity-50">{checkingProviders ? '설정 확인 중' : '설정 다시 확인'}</button></div>
 <button disabled={loading || (providers !== null && !providers[provider][mode as 'local' | 'blog' | 'cafe'])} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--lu-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Search size={17} />{loading ? '검색 중' : '검색하기'}</button>
 </form>
 {error && <div role="alert" className="mt-5 rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}{loginRequired ? <Link href="/login" className="mt-2 block min-h-[44px] py-2 font-semibold underline">로그인하기</Link> : <p className="mt-2">입력 내용을 유지했어요. 검색하기 버튼으로 다시 시도해보세요.</p>}</div>}
 {loading && <div aria-live="polite" aria-busy="true" className="mt-5 space-y-3">{[1, 2, 3].map(value => <div key={value} className="h-24 animate-pulse rounded-[10px] bg-slate-200" />)}<span className="sr-only">검색 결과를 기다리고 있어요.</span></div>}
 {result && <section aria-labelledby="results-title" className="mt-7 space-y-4">
 <div><h2 id="results-title" className="text-lg font-bold [overflow-wrap:anywhere]">{result.query} 검색 결과</h2><p className="mt-1 text-xs leading-5 text-[var(--lu-muted)]">{result.provider === 'naver' ? '네이버' : 'Google Maps'} 제공 · {new Date(result.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 조회 · 표시 {result.items.length}건</p><p className="mt-1 text-xs text-[var(--lu-muted)]">조건을 바꿨다면 다시 검색해보세요. 아래는 마지막으로 조회한 결과예요.</p></div>
 {result.provider === 'google' && <div className="space-y-2"><img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" width={144} height={18} />{result.attributions.map((item, index) => item.url ? <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="block min-h-[44px] py-2 text-xs text-[var(--lu-muted)] underline">{item.text}</a> : <p key={index} className="text-xs text-[var(--lu-muted)]">{item.text}</p>)}</div>}
 {result.items.length === 0 ? <div className="rounded-[10px] border border-[var(--lu-line)] bg-white p-6 text-sm leading-6">검색은 완료됐지만 결과가 없어요. 지역을 넓히거나 검색어를 바꿔보세요.<button type="button" onClick={() => keywordInput.current?.focus()} className="mt-3 block min-h-[44px] rounded-[6px] px-3 py-2 font-semibold text-[var(--lu-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lu-accent)]">검색어 바꾸기</button></div> : result.items.map((item, index) => <article key={`${item.url}-${index}`} className="min-w-0 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-5"><p className="text-xs text-[var(--lu-muted)]">{item.source}</p><h3 className="mt-2 break-words font-semibold">{item.title}</h3>{item.address && <p className="mt-2 break-words text-sm text-[var(--lu-muted)]">{item.address}</p>}{item.description && <p className="mt-2 break-words text-sm leading-6 text-[var(--lu-muted)]">{item.description}</p>}{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">출처 열기<ExternalLink size={15} /><span className="sr-only">새 창</span></a> : <p className="mt-3 text-xs text-[var(--lu-muted)]">제공된 출처 링크가 없어요.</p>}</article>)}
 {result.items.length > 0 && <><div className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-5"><h3 className="font-semibold">확인한 내용을 다음 작업으로 이어가세요</h3><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">매장 정보와 게시글 원문을 확인하고, 내 사업의 사실과 경험을 바탕으로 작성해보세요.</p><Link href={result.industry === 'agency' ? '/marketing/naver-ads' : '/marketing/blog-post'} className="mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">{result.industry === 'agency' ? '키워드 분석으로 이동' : '블로그 초안 도구로 이동'}<ArrowRight size={16} /></Link></div>
 <ToolNextSteps current="business-search" /></> }
 </section>}
 </main><Footer />
 </div>
}
