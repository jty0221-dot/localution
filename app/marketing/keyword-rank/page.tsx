'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { TrendingUp, ExternalLink } from 'lucide-react'
type Result = { keyword: string; placeId: string; rank: number | null; scannedCount: number; checkedAt: string; matchedTitle: string | null; note: string }
export default function KeywordRankPage() {
  const [keyword, setKeyword] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const current = useRef<AbortController | null>(null)
  const generation = useRef(0)
  useEffect(() => () => { ++generation.current; current.current?.abort() }, [])
  async function search(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const request = ++generation.current
    const controller = new AbortController(); current.current = controller
    const timer = setTimeout(() => controller.abort(), 25000)
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/naver-rank?' + new URLSearchParams({ keyword: keyword.trim(), placeId: placeId.trim() }), { signal: controller.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || data.ok !== true) throw new Error(data.error || '검색 자료를 받지 못했어요.')
      if (request === generation.current) setResult(data)
    } catch (reason) {
      if (request === generation.current) setError(controller.signal.aborted ? '조회 대기 시간이 길어졌어요. 이전 결과를 유지했어요. 다시 확인해보세요.' : reason instanceof Error ? reason.message : '검색 연결을 확인해보세요.')
    } finally { clearTimeout(timer); if (request === generation.current) setLoading(false) }
}
  const field = 'mt-2 min-h-[44px] w-full rounded-[6px] border border-[var(--lu-line)] px-3 py-2.5 text-base focus:outline-[var(--lu-accent)]'
  return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]"><Sidebar /><div className="md:ml-[220px] flex min-h-screen flex-col"><PageHeader icon={<TrendingUp size={28} />} title="플레이스 키워드 순위 확인" subtitle="순서가 확인되는 지도 검색 자료를 받아 내 플레이스 ID와 비교해요" /><main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6 md:px-6">
    <Link href="/marketing" className="inline-flex min-h-[44px] items-center font-semibold text-[var(--lu-accent)] underline">마케팅 도구로 돌아가기</Link>
    <div className="max-w-4xl rounded-[10px] border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed">공식 매장 검색 API의 목록은 플레이스 순위를 뜻하지 않아요. 이 도구는 지도 검색의 구조화된 목록을 받을 때만 순서를 표시해요. 네이버가 서버 접근을 제한하면 순위를 계산하지 않으며, 검색 목록 밖의 순위는 알 수 없어요.</div>
    <form onSubmit={search} className="max-w-4xl space-y-4 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-semibold">확인할 검색어<input required maxLength={80} value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="예: 부천 카페" className={field} /></label><label className="text-base font-semibold">플레이스 ID<input required inputMode="numeric" pattern="[0-9]{1,30}" maxLength={30} value={placeId} onChange={e => setPlaceId(e.target.value)} placeholder="네이버 매장 주소의 숫자 ID" className={field} /><span className="mt-2 block text-base font-normal text-[var(--lu-muted)]">상호명이 같은 다른 매장과 섞이지 않도록 ID로 확인해요.</span></label></div><button disabled={loading} className="min-h-[44px] rounded-[6px] bg-[var(--lu-accent)] px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? '검색 자료 확인 중' : '순위 확인하기'}</button><p className="text-xs leading-relaxed text-[var(--lu-muted)]">조회 성공 시각만 결과에 표시해요. 오류가 나면 입력값과 마지막 성공 결과를 유지해요.</p></form>
    {loading && <div role="status" className="max-w-4xl animate-pulse rounded-[10px] bg-white p-6 text-sm motion-reduce:animate-none">지도 검색 자료를 확인하고 있어요.</div>}
    {error && <div role="alert" className="max-w-4xl rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700">{error}<p className="mt-2">입력값을 유지했어요. 위의 순위 확인하기 버튼으로 다시 시도해보세요.</p><Link href="/login" className="mt-2 inline-flex min-h-[44px] items-center font-semibold underline">로그인 상태 확인하기</Link></div>}
    {result && <section aria-labelledby="rank-result-title" className="max-w-4xl min-w-0 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6"><h2 id="rank-result-title" className="break-words text-lg font-bold">마지막 성공 결과 · {result.keyword}</h2><p className="mt-2 break-words text-sm text-[var(--lu-muted)]">플레이스 ID {result.placeId} · {new Date(result.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 조회</p><p className="mt-4 text-xl font-bold tabular-nums">{result.rank === null ? `확인한 ${result.scannedCount}개 목록에서 찾지 못했어요` : `조회한 목록에서 ${result.rank}번째예요`}</p>{result.matchedTitle && <p className="mt-2 break-words text-sm">매칭된 매장: {result.matchedTitle}</p>}<p className="mt-3 text-sm leading-relaxed text-[var(--lu-muted)]">{result.note}</p><p className="mt-2 text-xs text-[var(--lu-muted)]">조건을 바꿨다면 다시 확인해보세요. 위 결과는 마지막 성공한 요청 기준이에요.</p></section>}
    <div className="max-w-4xl rounded-[10px] border border-[var(--lu-line)] bg-white p-4 text-sm md:p-6"><h2 className="font-bold">자료를 확인한 뒤 다음 작업을 해보세요</h2><div className="mt-3 flex flex-wrap gap-3"><a href={'https://map.naver.com/p/search/' + encodeURIComponent(keyword.trim())} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 text-[var(--lu-accent)] underline">네이버 지도에서 직접 확인<ExternalLink size={16} /><span className="sr-only">새 창</span></a><Link href="/marketing/business-search" className="inline-flex min-h-[44px] items-center text-[var(--lu-accent)] underline">매장·콘텐츠 검색으로 이동</Link></div></div>
  </main><Footer /></div></div>
}
