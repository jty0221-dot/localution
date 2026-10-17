'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { Target } from 'lucide-react'
export default function KeywordScorePage(){return <div className="min-h-screen bg-[var(--lu-canvas)]"><Sidebar/><div className="md:ml-[220px] flex min-h-screen flex-col"><PageHeader icon={<Target size={28}/>} title="키워드 점수" subtitle="조회할 수 있는 실제 자료를 확인하세요."/><main className="mx-auto w-full max-w-4xl flex-1 p-5"><section className="lu-panel p-6"><h1 className="text-xl font-semibold">키워드 종합 점수는 아직 집계하지 않아요</h1><p role="status" className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">실제 자료로 확인하지 않은 노출 점수, 검색량, 경쟁도와 현재 순위를 표시하지 않아요. 검색량과 플레이스 순위는 각각의 조회 화면에서 확인해주세요.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/marketing/naver-ads" className="lu-primary inline-flex items-center">실제 검색량 조회</Link><Link href="/marketing/keyword-rank" className="inline-flex min-h-11 items-center rounded-[6px] border border-[var(--lu-line)] px-4 text-sm">플레이스 순위 조회</Link><Link href="/marketing/place" className="inline-flex min-h-11 items-center px-3 text-sm text-[var(--lu-accent)]">매장 정보 점검</Link></div><p className="mt-4 text-xs leading-6 text-[var(--lu-muted)]">조회에는 로그인과 정상적인 공급자 연결이 필요해요. 수집이 차단되거나 인증이 실패하면 해당 조회 화면에서 오류를 안내해요.</p></section></main><Footer/></div></div>}
