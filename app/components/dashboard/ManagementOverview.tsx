'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Layers, RefreshCw } from 'lucide-react'
import { buildManagementOverview, type StoreSnapshot, type IssueSnapshot } from '@/app/lib/management-overview'

async function readSnapshot(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: 'no-store', credentials: 'include' })
  if (!response.ok) throw new Error('자료를 읽지 못했어요')
  const data = await response.json()
  if (data.ok !== true) throw new Error('자료 확인이 필요해요')
  return data
}
export default function ManagementOverview() {
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<StoreSnapshot | null>(null)
  const [issues, setIssues] = useState<IssueSnapshot | null>(null)
  const [error, setError] = useState('')
  const [readAt, setReadAt] = useState<string | null>(null)
  const generation = useRef(0)
  useEffect(() => {
    const request = ++generation.current
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    setLoading(true); setStore(null); setIssues(null); setError(''); setReadAt(null)
    Promise.allSettled([
      readSnapshot('/api/stores/me', controller.signal),
      readSnapshot('/api/user/platform-issues', controller.signal),
    ]).then(([storeResult, issueResult]) => {
      if (generation.current !== request) return
      if (storeResult.status !== 'fulfilled' || !storeResult.value.user_id || !Array.isArray(storeResult.value.platforms)) {
        setError('계정 자료를 읽지 못했어요. 로그인과 인터넷 연결을 확인한 뒤 다시 시도해보세요.')
        return
      }
      setStore(storeResult.value); setReadAt(new Date().toISOString())
      if (issueResult.status === 'fulfilled' && issueResult.value.user_id === storeResult.value.user_id && Array.isArray(issueResult.value.issues)) setIssues(issueResult.value)
      else setError('매체 연결 점검 자료를 읽지 못했어요. 확인된 저장 자료는 아래에 표시했어요.')
    }).finally(() => {
      clearTimeout(timer)
      if (generation.current === request) setLoading(false)
    })
    return () => { ++generation.current; clearTimeout(timer); controller.abort() }
  }, [attempt])
  const overview = store ? buildManagementOverview(store, issues) : null
  const fields: Record<string, string> = { address: '주소', phone: '연락처', category: '업종' }
  return <section aria-labelledby="management-overview-title" className="my-5 min-w-0 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm"><Layers size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" /></div>
        <div className="min-w-0"><h2 id="management-overview-title" className="text-base font-bold text-[#191F28] md:text-lg">내 매체 통합 점검</h2><p className="text-sm text-[#8B95A1]">확인된 자료와 먼저 해결할 일을 함께 보세요</p></div>
      </div>
      <button type="button" disabled={loading} onClick={() => setAttempt(n => n + 1)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E5E8EB] px-3 text-sm font-semibold text-[#3182F6] disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />다시 확인</button>
    </div>
    <p className="mt-4 rounded-xl bg-[#F8F9FA] p-3 text-sm leading-relaxed text-[#191F28]">이 로그인 계정에 등록된 매체 자료를 보여줘요. 기본 매장과 매체별 연결 매장이 다를 수 있어요. 여러 매장 합산 자료를 특정 매장의 성과로 표시하지 않아요. 검색·콘텐츠·고객·예약 도구에서 작업 후 결과를 확인해보세요.</p>
    {loading && <div role="status" className="mt-4"><span className="sr-only">계정과 매체 자료를 확인하고 있어요</span><div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden="true">{[1, 2].map(n => <div key={n} className="h-28 animate-pulse rounded-xl bg-[#F8F9FA] motion-reduce:animate-none" />)}</div></div>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!loading && store && overview && <>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#191F28]"><p>기본 매장: <span className="font-semibold">{store.source_states?.store === 'read' ? store.store?.name || '등록 자료 없음' : '조회 미확인'}</span></p><p>저장 수집 시각 확인: <span className="tabular-nums">{overview.checkedPlatforms} / {overview.platforms.length}</span>개 매체</p></div>
      <p className="mt-2 text-xs text-[#8B95A1]">저장 자료 조회 시각: {readAt ? new Date(readAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '미확인'} · 외부 실조회 시각이 아니에요</p>
      {store.source_states?.store === 'read' && !store.store && <Link href="/settings?tab=store" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#3182F6] underline">기본 매장 등록하기</Link>}
      {store.source_states?.store !== 'read' && <p className="mt-2 text-sm text-[#8B95A1]">기본 매장 자료는 미확인이에요. 위의 다시 확인 버튼으로 재조회해보세요.</p>}
      <details className="mt-2 text-xs leading-relaxed text-[#8B95A1]"><summary className="min-h-[44px] cursor-pointer py-3">점검 범위와 시각 기준</summary><p>분모는 이 계정의 지원 매체 수이고, 분자는 저장 리뷰에 유효한 수집 시각이 있는 매체 수예요. 점수나 현재 로그인 성공률이 아니에요. 수집 시각은 저장 행의 기록이며 예시로 입력된 자료가 포함될 수 있어요. 지금 외부 매체를 조회하거나 실제 매체 자료임을 검증한 시각이 아니에요. 7일이 지난 기록은 오래됨으로 표시해요. 연결 등록일은 수집 시각으로 사용하지 않아요. 발행·고객 발송·광고 변경을 이 화면에서 자동 실행하지 않아요.</p></details>
      {overview.priorities.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><h3 className="text-sm font-bold text-[#191F28]">먼저 확인할 일</h3><ol className="mt-2 space-y-2">{overview.priorities.slice(0, 3).map(p => <li key={p.id} className="text-sm"><Link href={p.href} className="inline-flex min-h-[44px] items-center font-semibold text-[#3182F6] underline underline-offset-4">{p.label} · {p.status}</Link><p className="text-xs text-[#8B95A1]">계정 연결 대상: {p.storeName}</p></li>)}</ol></div>}
      {overview.missing && overview.missing.length > 0 && <p className="mt-3 text-sm text-[#191F28]">기본 매장 정보 {overview.missing.length} / 3개 항목이 비어 있어요: {overview.missing.map(f => fields[f]).join(' · ')}. <Link href="/settings?tab=store" className="inline-flex min-h-[44px] items-center font-semibold text-[#3182F6] underline">매장 정보 확인하기</Link></p>}
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">{overview.platforms.map(p => <article key={p.id} className="min-w-0 rounded-xl border border-[#E5E8EB] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-[#191F28]">{p.label}</h3><span className="rounded-lg bg-[#F8F9FA] px-2 py-1 text-xs font-semibold text-[#191F28]">{p.status}</span></div><p className="mt-2 truncate text-xs text-[#8B95A1]" title={p.storeName}>계정 연결 대상: {p.storeName}</p><p className="mt-2 text-sm leading-relaxed text-[#191F28]">{p.detail}</p><p className="mt-2 text-xs text-[#8B95A1]">저장 리뷰 수집 기록: {p.collectedAt ? new Date(p.collectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '미확인'}</p><Link href={p.href} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#3182F6] underline underline-offset-4">{p.action}</Link></article>)}</div>
      <details className="mt-4 border-t border-[#E5E8EB] pt-2"><summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-[#191F28]">다른 업무 이어서 하기</summary><div className="flex flex-wrap gap-2">{[['/marketing/business-search', '매장·콘텐츠 검색'], ['/marketing/notice', '가게 공지 작성'], ['/customers', '고객 관리'], ['/reservations', '예약 관리'], ['/help#find-tools', '업종별 도구 찾기']].map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-[44px] items-center rounded-xl border border-[#E5E8EB] px-3 text-sm text-[#3182F6]">{label}</Link>)}</div></details>
    </>}
  </section>
}
