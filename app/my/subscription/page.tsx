'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { CreditCard } from 'lucide-react'
import { useEntitlements } from '../../lib/entitlements'
export default function MySubscriptionPage(){
 const { loading, error } = useEntitlements()
 return <div className="min-h-screen bg-[var(--lu-canvas)]"><Sidebar /><div className="md:ml-[220px] flex min-h-screen flex-col"><PageHeader icon={<CreditCard size={28}/>} title="내 구독" subtitle="확인된 구독과 결제 내역을 기준으로 이용 권한을 확인하세요." /><main className="mx-auto w-full max-w-4xl flex-1 p-5"><section className="lu-panel p-6"><h1 className="text-xl font-semibold">구독 상태 확인 필요</h1><p role="status" className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">{loading ? '구독 확인 안내를 불러오고 있어요.' : error}</p><p className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">확인되지 않은 모듈이나 월 결제액을 표시하지 않아요. 기존 계약·결제 내역과 구독 변경은 문의를 통해 확인해주세요.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/inquiry?category=구독" className="lu-primary inline-flex items-center">구독 내역 확인 문의</Link><Link href="/settings" className="inline-flex min-h-11 items-center rounded-[6px] border border-[var(--lu-line)] px-4 text-sm">설정에서 결제수단 확인</Link><Link href="/marketing" className="inline-flex min-h-11 items-center px-3 text-sm text-[var(--lu-accent)]">마케팅 도구 보기</Link></div><p className="mt-4 text-xs leading-6 text-[var(--lu-muted)]">결제수단 등록과 유료 모듈 구독은 별도예요. 이 화면에서는 새 결제나 해지를 실행하지 않아요.</p></section></main><Footer /></div></div>
}
