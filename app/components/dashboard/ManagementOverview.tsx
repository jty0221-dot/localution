'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
export default function ManagementOverview({ children, onRefresh, expectedAccountId }: { children?: ReactNode; onRefresh?: () => void; expectedAccountId?: string | null }) {
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
      if (storeResult.status !== 'fulfilled' || !storeResult.value.user_id || (expectedAccountId && String(storeResult.value.user_id) !== expectedAccountId) || !Array.isArray(storeResult.value.platforms)) {
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
  }, [attempt, expectedAccountId])
  return <ManagementOverviewView store={store} issues={issues} loading={loading} error={error} readAt={readAt} onRefresh={() => { setAttempt(n => n + 1); onRefresh?.() }}>{children}</ManagementOverviewView>
}

function count(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 }
export function ManagementOverviewView({ store, issues, loading, error, readAt, onRefresh, children }: {
 store: StoreSnapshot | null; issues: IssueSnapshot | null; loading: boolean; error: string; readAt: string | null; onRefresh?: () => void; children?: ReactNode
}) {
 const overview = store ? buildManagementOverview(store, issues) : null
 const reviewsRead = store?.source_states?.reviews === 'read'
 const countsKnown = reviewsRead && !!store?.platforms.length && store.platforms.every(p => count(p.review_count) && count(p.unreplied_count))
 const total = countsKnown ? store!.platforms.reduce((n, p) => n + p.review_count!, 0) : null
 const pending = countsKnown ? store!.platforms.reduce((n, p) => n + p.unreplied_count!, 0) : null
 const statesKnown = store?.source_states?.credentials === 'read' && issues?.source_state === 'read' && issues.user_id === store?.user_id
 const attention = statesKnown && overview ? overview.platforms.filter(p => p.priority < 3).length : null
 const firstUse = !!overview && statesKnown && !store?.platforms.some(p => p.connected)
 const tasks: { id: string; title: string; detail: string; href: string; action: string }[] = []
 if (error) tasks.push({ id: 'read-error', title: '저장 자료 조회 확인', detail: error, href: '/my/platforms', action: '연결 상태 확인' })
 if (pending !== null && pending > 0) tasks.push({ id: 'reviews', title: `미답변 저장 리뷰 ${pending}건 검토`, detail: '계정 전체 저장 자료 기준이에요. 낮은 별점과 내용을 확인하고 답변을 준비하세요.', href: '/reviews?filter=unanswered', action: '리뷰 검토' })
 if (overview) for (const p of overview.priorities) {
  if (tasks.length >= 3) break
  if (tasks.some(t => t.href === p.href)) continue
  tasks.push({ id: p.id, title: `${p.label} · ${p.status}`, detail: `계정 연결 대상: ${p.storeName}`, href: p.href, action: p.action })
 }
 const fmt = (date: string | null) => date ? new Date(date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '미확인'
 const card = 'min-w-0 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6'
 return <div className="space-y-5">
 <header className={card}>
 <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-[var(--lu-accent)]">계정 업무 현황</p><h1 className="mt-1 text-2xl font-semibold text-[var(--lu-ink)]">대시보드</h1><p className="mt-2 break-words text-sm text-[var(--lu-muted)]">기본 매장: {store?.source_states?.store === 'read' ? store.store?.name || '등록 자료 없음' : '조회 미확인'}</p></div><button type="button" disabled={loading} onClick={onRefresh} className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-[var(--lu-line)] px-3 text-sm font-semibold text-[var(--lu-accent)] disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />저장 자료 재조회</button></div>
 <p className="mt-3 text-xs text-[var(--lu-muted)]">조회 대상: 로그인 계정 전체 · 매체별 연결 매장이 다를 수 있어요</p><p className="mt-1 text-xs text-[var(--lu-muted)]">저장 자료 조회 시각: {fmt(readAt)} · 외부 실조회 시각이 아니에요</p>
 </header>
 {loading ? <section role="status" className={card}><h2 className="font-semibold">저장 자료 확인 중</h2><p className="mt-2 text-sm text-[var(--lu-muted)]">계정의 매장·리뷰·연결 점검 자료를 읽고 있어요.</p></section> : firstUse && !error ? <section className={card}><h2 className="text-lg font-semibold">첫 수집 결과부터 확인하세요</h2><ol className="mt-3 space-y-2 text-sm"><li>1. 기본 매장 정보 확인</li><li>2. 사용할 매체 연결</li><li>3. 리뷰 화면에서 첫 수집 결과 확인</li></ol><div className="mt-3 flex flex-wrap gap-3"><Link href="/settings?tab=store" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--lu-accent)] underline">매장 정보 확인</Link><Link href="/my/platforms" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--lu-accent)] underline">매체 연결</Link></div><p className="mt-3 text-sm text-[var(--lu-muted)]">연결 전에도 <Link href="/marketing/notice" className="underline">가게 공지 작성</Link>과 <Link href="/marketing/cost-calculator" className="underline">원가 계산</Link>을 이용할 수 있어요.</p></section> : <section aria-labelledby="dashboard-tasks" className={card}><h2 id="dashboard-tasks" className="text-lg font-semibold">먼저 처리할 일</h2>{tasks.length ? <ol className="mt-3 divide-y divide-[var(--lu-line)]">{tasks.slice(0, 3).map(t => <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1 basis-48"><h3 className="break-words text-sm font-semibold">{t.title}</h3><p className="mt-1 break-words text-xs text-[var(--lu-muted)]">{t.detail}</p></div><Link href={t.href} className="inline-flex min-h-11 items-center rounded-[6px] border border-[var(--lu-line)] px-3 text-sm font-semibold text-[var(--lu-accent)]">{t.action}</Link></li>)}</ol> : <p className="mt-3 text-sm text-[var(--lu-muted)]">{store ? '확인된 저장 자료에서 우선 처리할 항목이 없어요. 외부 매체의 현재 상태까지 보장하지는 않아요.' : '자료를 읽지 못해 처리할 일을 판단하지 못했어요.'}</p>}</section>}
 {!loading && !firstUse && <section aria-label="저장 자료 핵심 현황" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">{[{ label: '저장 리뷰', value: total, unit: '건', source: '/api/stores/me · reviews 상태 확인' }, { label: '미답변 저장 리뷰', value: pending, unit: '건', source: '/api/stores/me · 계정 전체' }, { label: '연결 점검 필요', value: attention, unit: '개 매체', source: '/api/stores/me · platform-issues' }].map(k => <article key={k.label} className={card}><h2 className="text-sm font-medium text-[var(--lu-muted)]">{k.label}</h2><p className="mt-3 text-2xl font-semibold tabular-nums">{k.value === null ? <span className="text-lg">미확인</span> : <>{k.value.toLocaleString('ko-KR')}<span className="ml-1 text-sm font-medium">{k.unit}</span></>}</p><p className="mt-3 break-words text-xs text-[var(--lu-muted)]">{k.label === '연결 점검 필요' ? '저장 연결 기록 점검 기준' : '계정의 저장 리뷰 조회 기준'}</p></article>)}</section>}
 {children}
 <section aria-labelledby="management-overview-title" className={card}><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="management-overview-title" className="text-lg font-semibold">매체 연결과 수집 상태</h2><Link href="/my/platforms" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--lu-accent)] underline">연결 관리</Link></div>
 {loading ? <p className="mt-3 text-sm">저장 연결 자료 확인 중</p> : !overview ? <p className="mt-3 text-sm text-[var(--lu-muted)]">매체 상태를 읽지 못했어요. 상단 재조회 버튼으로 다시 확인해주세요.</p> : <><div className="mt-4 overflow-x-auto rounded-[6px] border border-[var(--lu-line)]" role="region" aria-label="매체별 상태 표" tabIndex={0}><table className="w-full min-w-[650px] text-left text-sm"><caption className="sr-only">계정 매체별 연결 대상, 저장 상태, 마지막 수집 기록과 조치</caption><thead className="bg-[var(--lu-canvas)]"><tr>{['매체', '연결 대상', '저장 상태', '마지막 수집 기록', '조치'].map(h => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{overview.platforms.map(p => <tr key={p.id} className="border-t border-[var(--lu-line)]"><th scope="row" className="px-3 py-3 font-semibold">{p.label}</th><td className="max-w-[180px] break-words px-3 py-3">{p.storeName}</td><td className="px-3 py-3"><span className="inline-block rounded-[6px] bg-[var(--lu-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--lu-accent)]">{p.status}</span></td><td className="px-3 py-3 text-xs">{fmt(p.collectedAt)}</td><td className="px-3 py-3"><Link href={p.href} className="inline-flex min-h-11 items-center text-[var(--lu-accent)] underline">{p.action}</Link></td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-[var(--lu-muted)] lg:hidden">표를 좌우로 밀어 저장 상태와 수집 시각, 다음 조치를 확인하세요.</p><details className="mt-3 text-sm text-[var(--lu-muted)]"><summary className="min-h-11 cursor-pointer py-3">점검 범위와 시각 기준</summary><p className="leading-relaxed">기본 매장과 매체별 연결 대상이 다를 수 있어요. 계정 등록은 인증 성공이나 실제 수집 성공을 뜻하지 않아요. 시각은 저장된 리뷰 행의 기록이며 현재 외부 매체를 조회한 시각이 아니에요. 7일이 지난 기록은 오래됨으로 표시해요. 조회 미확인과 정상 0건을 구분하며, 발행·고객 발송·광고 변경은 자동 실행하지 않아요.</p></details></>}
 </section>
 </div>
}
