'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Suspense } from 'react'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import MarketingToolChooser from '../components/marketing/MarketingToolChooser'
import ChannelTaskLinks from '../components/marketing/ChannelTaskLinks'
import Footer from '../components/Footer'
import HarangMarketingPopup from '../components/HarangMarketingPopup'
import { Rocket, ArrowRight } from 'lucide-react'

export default function MarketingPage() {
 return <div className="min-h-screen bg-[var(--lu-canvas)]"><div className="flex flex-1"><Suspense fallback={<aside aria-hidden="true" className="hidden md:block fixed inset-y-0 left-0 w-[220px] bg-white" />}><Sidebar /></Suspense><main className="flex-1 ml-0 md:ml-[220px] pt-4 md:pt-0 min-w-0"><PageHeader icon={<Rocket size={28} />} title="마케팅" subtitle="필요한 도구를 선택하고 실제 조회 결과를 확인하세요." variant="accent" /><div className="max-w-5xl mx-auto p-4 md:p-8"><ChannelTaskLinks /><MarketingToolChooser /><details className="lu-panel mt-6 p-5" aria-labelledby="marketing-measurement-title"><summary id="marketing-measurement-title" className="flex min-h-11 cursor-pointer items-center text-base font-semibold">연결된 자료를 조회하려면</summary><p className="mt-2 text-sm text-[var(--lu-muted)]">순위·검색량·리뷰는 연결된 자료를 실제로 조회한 화면에서 확인하세요. 조회하지 않은 통계를 표시하지 않아요.</p><div className="mt-4 flex flex-wrap gap-3">{[{href:'/marketing/keyword-rank',label:'플레이스 순위 조회'},{href:'/marketing/naver-ads',label:'키워드 검색량 조회'},{href:'/marketing/place',label:'매장 정보 점검'},{href:'/review-admin',label:'수집된 리뷰 확인'}].map(item=><Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-[var(--lu-line)] px-4 py-2 text-sm font-semibold text-[var(--lu-accent)]">{item.label}<ArrowRight size={16} aria-hidden="true" /></Link>)}</div><p className="mt-4 text-xs text-[var(--lu-muted)]">공급자 조회가 차단되거나 인증이 필요하면 해당 화면의 안내를 확인해주세요. 유입 통계는 별도 분석 도구의 실제 수집 설정이 필요해요.</p></details></div></main></div><Footer /><HarangMarketingPopup /></div>
}
