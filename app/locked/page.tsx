'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getModule, type ModuleId } from '../lib/modules'
import { useEntitlements } from '../lib/entitlements'
function LockedPageInner() {
 const params = useSearchParams()
 const requested = params.get('m')
 const module = requested ? getModule(requested as ModuleId) : undefined
 const { loading, error } = useEntitlements()
 return <main className="mx-auto max-w-2xl px-5 py-16"><section className="lu-panel p-6"><p className="lu-label">구독 권한 확인</p><h1 className="mt-3 text-2xl font-semibold">{module ? `${module.name} 이용 권한을 확인해주세요` : '이용 권한을 확인해주세요'}</h1><p role="status" className="mt-4 text-sm leading-7 text-[var(--lu-muted)]">{loading ? '확인 상태를 불러오고 있어요.' : error}</p><p className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">이 화면에서 결제를 진행하거나 구독을 활성화하지 않아요. 기존 결제 내역이 있다면 문의를 통해 확인해주세요.</p><nav aria-label="구독 확인 안내" className="mt-6 flex flex-wrap gap-3"><Link href="/inquiry?category=구독" className="lu-primary inline-flex items-center">구독 확인 문의</Link><Link href="/my/subscription" className="inline-flex min-h-11 items-center rounded-[6px] border border-[var(--lu-line)] px-4 text-sm">내 구독 확인</Link><Link href="/marketing" className="inline-flex min-h-11 items-center px-3 text-sm text-[var(--lu-accent)]">마케팅 도구 보기</Link></nav></section></main>
}
export default function LockedPage(){return <Suspense fallback={<p role="status" className="p-8">안내를 불러오고 있어요.</p>}><LockedPageInner /></Suspense>}
