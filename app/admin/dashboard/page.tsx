'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '../../lib/adminFetch'
import { MessageSquare, ArrowRight, Clock, CheckCircle2, Inbox, AlertCircle, Circle, Coins, Users, UserCheck, type LucideIcon } from 'lucide-react'

type Overview = {
 subscriptions: { active: number; past_due: number; cancelled: number; total: number }
 mrr_krw: number
 users_total: number
 customers_total: number
 loaded: boolean
}

type InquirySummary = {
 total: number; new: number; replied: number; completed: number
}
type InquiryLite = {
 id: string; name: string; category: string; message: string;
 status: 'new' | 'replied' | 'completed'; createdAt: string
}

const EMPTY: Overview = {
 subscriptions: { active: 0, past_due: 0, cancelled: 0, total: 0 },
 mrr_krw: 0,
 users_total: 0,
 customers_total: 0,
 loaded: false,
}

const INQ_STATUS: Record<InquiryLite['status'], { label: string; bg: string; color: string }> = {
 new: { label: '신규', bg: '#FEF3C7', color: '#92400E' },
 replied: { label: '답변완료', bg: '#DBEAFE', color: '#1E40AF' },
 completed: { label: '처리완료', bg: '#D1FAE5', color: '#065F46' },
}

function fmtInqDate(iso: string) {
 const d = new Date(iso)
 return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminDashboardPage() {
 const [data, setData] = useState<Overview>(EMPTY)
 const [err, setErr] = useState<string | null>(null)
 const [inqSummary, setInqSummary] = useState<InquirySummary>({ total: 0, new: 0, replied: 0, completed: 0 })
 const [inqRecent, setInqRecent] = useState<InquiryLite[]>([])
 const [inqLoaded, setInqLoaded] = useState(false)
 const [inqError, setInqError] = useState(false)

 useEffect(() => {
 (async () => {
 try {
 const res = await adminFetch('/api/admin/overview')
 if (!res.ok) {
 setErr(`오버뷰 로드 실패 (${res.status})`)
 return
 }
 const json = await res.json()
 setData({ ...json, loaded: true })
 } catch (e) {
 setErr(e instanceof Error ? e.message : 'fetch error')
 }
 })()
 }, [])

 useEffect(() => {
 (async () => {
 try {
 const res = await adminFetch('/api/inquiry')
 if (!res.ok) { setInqError(true); return }
 const json = await res.json()
 if (!json.summary || !Array.isArray(json.inquiries)) { setInqError(true); return }
 setInqSummary(json.summary)
 if (Array.isArray(json.inquiries)) setInqRecent(json.inquiries.slice(0, 5))
 } catch { setInqError(true) }
 finally { setInqLoaded(true) }
 })()
 }, [])


 const kpis: { label: string; value: number; Icon: LucideIcon; color: string; krw?: boolean }[] = [
 { label: '활성 구독', value: data.subscriptions.active, Icon: CheckCircle2, color: '#16A34A' },
 { label: '연체 구독', value: data.subscriptions.past_due, Icon: AlertCircle, color: '#CA8A04' },
 { label: '해지 구독', value: data.subscriptions.cancelled, Icon: Circle, color: '#8B95A1' },
 { label: '월 예상 매출', value: data.mrr_krw, Icon: Coins, color: '#3182F6', krw: true },
 { label: '가입 사용자', value: data.users_total, Icon: Users, color: '#7C3AED' },
 { label: '등록 고객 합계', value: data.customers_total, Icon: UserCheck, color: '#F59E0B' },
 ]

 return (
 <div className="p-4 md:p-8 max-w-6xl mx-auto">
 <header className="mb-6">
 <h1 className="text-2xl font-semibold text-[var(--lu-ink)] tracking-tight">대시보드</h1>
 <p className="text-sm text-[var(--lu-muted)] mt-1">전체 구독 · 매출 · 사용자 · CRM 현황</p>
 </header>

 {err && (
 <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-[6px] p-4 mb-5">
 {err} · 서비스 롤 키 또는 RLS 설정을 확인해주세요.
 </div>
 )}

 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
 {kpis.map(k => (
 <div key={k.label} className="bg-white rounded-[10px] p-5 shadow-none">
 <div className="w-9 h-9 rounded-[6px] flex items-center justify-center mb-2" style={{ background: k.color + '15', color: k.color }}>
 <k.Icon size={18} strokeWidth={2.5} />
 </div>
 <div className="text-2xl md:text-3xl font-semibold" style={{ color: k.color }}>
 {!data.loaded ? '-' : k.krw ? `₩${k.value.toLocaleString()}` : k.value.toLocaleString()}
 </div>
 <div className="text-xs text-[var(--lu-muted)] font-medium mt-1">{k.label}</div>
 </div>
 ))}
 </div>

 <section className="mb-6 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6">
 <h2 className="font-semibold">집계 이력 없음</h2>
 <p className="mt-2 text-sm text-[var(--lu-muted)]">기간별 매출 추이와 모듈별 구독 이력은 아직 연결되지 않았습니다. 확인된 현재 집계만 표시합니다.</p>
 </section>

 <div className="bg-white rounded-[10px] shadow-none p-5">
 <div className="flex items-center justify-between mb-3">
 <h2 className="font-semibold text-[var(--lu-ink)]">구독 상태 분포</h2>
 <span className="text-xs text-[var(--lu-muted)]">{data.loaded ? `총 ${data.subscriptions.total}건` : '집계 확인 전'}</span>
 </div>
 <div className="space-y-2">
 {[
 { label: '활성', value: data.subscriptions.active, color: '#16A34A' },
 { label: '연체', value: data.subscriptions.past_due, color: '#CA8A04' },
 { label: '해지', value: data.subscriptions.cancelled, color: '#8B95A1' },
 ].map(row => {
 const pct = data.subscriptions.total > 0
 ? Math.round((row.value / data.subscriptions.total) * 100)
 : 0
 return (
 <div key={row.label}>
 <div className="flex justify-between text-xs text-[var(--lu-muted)] font-semibold mb-1">
 <span>{row.label}</span>
 <span>{data.loaded ? `${row.value}건 · ${pct}%` : '확인 전'}</span>
 </div>
 <div className="w-full bg-[var(--lu-canvas)] rounded-full h-2">
 <div className="h-2 rounded-full" style={{ width: data.loaded ? `${pct}%` : '0%', background: row.color }} />
 </div>
 </div>
 )
 })}
 </div>
 </div>

 {/* 1:1 문의 요약 + 최근 5건 */}
 <div className="bg-white rounded-[10px] shadow-none p-5 mt-4">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-[var(--lu-accent-soft)] flex items-center justify-center">
 <MessageSquare size={16} strokeWidth={2.25} className="text-[#16685D]" />
 </div>
 <div>
 <h2 className="font-semibold text-[var(--lu-ink)]">1:1 문의 관리</h2>
 <p className="text-xs text-[var(--lu-muted)] mt-0.5">고객 문의 종합 조회 · 답변 작성 · 완료 처리</p>
 </div>
 </div>
 <Link
 href="/admin/inquiries"
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#16685D] text-white text-xs font-bold hover:bg-[#105448]"
 >
 관리 페이지 열기 <ArrowRight size={12} strokeWidth={2.5} />
 </Link>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
 {[
 { label: '전체', value: inqSummary.total, icon: Inbox, color: '#3182F6', bg: '#EFF6FF' },
 { label: '신규', value: inqSummary.new, icon: Clock, color: '#92400E', bg: '#FEF3C7' },
 { label: '답변완료', value: inqSummary.replied, icon: MessageSquare, color: '#1E40AF', bg: '#DBEAFE' },
 { label: '처리완료', value: inqSummary.completed, icon: CheckCircle2, color: '#065F46', bg: '#D1FAE5' },
 ].map(k => {
 const Icon = k.icon
 return (
 <div key={k.label} className="rounded-[6px] p-3" style={{ background: k.bg }}>
 <div className="flex items-center justify-between">
 <Icon size={14} strokeWidth={2.5} style={{ color: k.color }} />
 <span className="text-xl font-semibold" style={{ color: k.color }}>
 {inqError ? '확인 필요' : inqLoaded ? k.value.toLocaleString() : '-'}
 </span>
 </div>
 <div className="text-xs font-bold mt-0.5" style={{ color: k.color }}>{k.label}</div>
 </div>
 )
 })}
 </div>

 <div className="border border-[var(--lu-canvas)] rounded-[6px] overflow-hidden">
 <div className="px-4 py-2.5 border-b border-[var(--lu-canvas)] bg-[#FAFBFF] text-xs text-[var(--lu-muted)] font-bold">
 최근 문의 {inqRecent.length === 0 ? '' : `5건`}
 </div>
 {inqError ? (<div role="alert" className="px-4 py-6 text-sm text-[var(--lu-danger)]">문의 집계를 확인하지 못했습니다. 문의 관리에서 다시 확인해주세요.</div>) : !inqLoaded ? (
 <div className="px-4 py-6 text-center text-xs text-[var(--lu-muted)]">불러오는 중…</div>
 ) : inqRecent.length === 0 ? (
 <div className="px-4 py-6 text-center text-xs text-[var(--lu-muted)]">아직 접수된 문의가 없습니다.</div>
 ) : (
 <ul className="divide-y divide-[var(--lu-canvas)]">
 {inqRecent.map(inq => {
 const m = INQ_STATUS[inq.status]
 return (
 <li key={inq.id} className="px-4 py-2.5 flex items-center gap-3">
 <span
 className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
 style={{ background: m.bg, color: m.color }}
 >
 {m.label}
 </span>
 <span className="text-xs font-bold text-[var(--lu-ink)] flex-shrink-0">{inq.name}</span>
 <span className="text-xs text-[var(--lu-muted)] line-clamp-1 flex-1">{inq.message}</span>
 <span className="text-xs text-[var(--lu-muted)] flex-shrink-0">{fmtInqDate(inq.createdAt)}</span>
 </li>
 )
 })}
 </ul>
 )}
 </div>
 </div>

 </div>
 )
}
