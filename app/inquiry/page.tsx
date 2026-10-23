'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { COMPANY } from '../lib/company'
import {
 MessageCircle, Wrench, CreditCard, Sparkles, FileText,
 CheckCircle2, ShoppingCart, Mail, Inbox, Plus, LucideIcon,
 Clock, MessageSquare, X, RefreshCw, ArrowRight,
 Headphones, Send,
} from 'lucide-react'

// ── 전역 keyframe ────────────────────────────────────────────
const GLOBAL_STYLES = `
 @keyframes pulse-dot {
 0%,100% { transform: scale(1); opacity: 1; }
 50% { transform: scale(1.5); opacity: 0.6; }
 }
 @keyframes slide-up {
 from { opacity: 0; transform: translateY(16px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes check-pop {
 0% { transform: scale(0.5); opacity: 0; }
 60% { transform: scale(1.15); }
 100% { transform: scale(1); opacity: 1; }
 }
`

const CATEGORIES: { value: string; label: string; Icon: LucideIcon; color: string }[] = [
 { value: '서비스문의', label: '서비스 문의', Icon: MessageCircle, color: '#16685D' },
 { value: '기술문의', label: '기술 문의', Icon: Wrench, color: '#8B5CF6' },
 { value: '요금결제', label: '요금 · 결제', Icon: CreditCard, color: '#059669' },
 { value: '기능요청', label: '기능 요청', Icon: Sparkles, color: '#F59E0B' },
 { value: '기타', label: '기타', Icon: FileText, color: '#4E5968' },
]

const STORAGE_KEY = 'localution.inquiries_mine'

type InquiryStatus = 'new' | 'replied' | 'completed'

interface MyInquiry {
 id: string
 name: string
 contact: string
 category: string
 message: string
 status: InquiryStatus
 createdAt: string
 reply?: string | null
 repliedAt?: string | null
 completedAt?: string | null
}

const STATUS_META: Record<InquiryStatus, { label: string; bg: string; color: string; icon: LucideIcon }> = {
 new: { label: '접수 완료', bg: '#FEF3C7', color: '#92400E', icon: Clock },
 replied: { label: '답변 완료', bg: '#DBEAFE', color: '#1E40AF', icon: MessageSquare },
 completed: { label: '처리 완료', bg: '#D1FAE5', color: '#065F46', icon: CheckCircle2 },
}

function loadMine(): MyInquiry[] {
 if (typeof window === 'undefined') return []
 try {
 const raw = localStorage.getItem(STORAGE_KEY)
 if (!raw) return []
 const arr = JSON.parse(raw)
 return Array.isArray(arr) ? arr : []
 } catch { return [] }
}
function saveMine(list: MyInquiry[]) {
 if (typeof window === 'undefined') return
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50))) } catch {}
}
function formatDate(iso: string) {
 return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── FAQ ────────────────────────────────────────────────────
function FAQSection() {
 const [open, setOpen] = useState<number | null>(0)
 const faqs = [
 { q: '무료 체험이 있나요?', a: '네, 베타 테스트 기간 동안 전 기능을 100% 무료로 사용하실 수 있어요. 카드 등록 없이 바로 시작 가능합니다.' },
 { q: '요금제는 어떻게 구성되나요?', a: '필요한 기능만 골라 담는 모듈형입니다. 3개 이상 선택 시 최대 20% 번들 할인이 자동 적용돼요.' },
 { q: '해지는 언제든 가능한가요?', a: '월 단위 구독이며 언제든 해지할 수 있습니다. 해지 즉시 다음 결제일부터 과금이 중단돼요.' },
 { q: '세금계산서 발행되나요?', a: '네, 사업자 회원은 매월 자동으로 전자세금계산서가 발행됩니다.' },
 { q: '매장이 여러 개여도 쓸 수 있나요?', a: '다중 매장 관리 기능으로 한 계정에서 여러 지점을 통합 운영할 수 있어요. 마케팅 대행사용 멀티 클라이언트 모드도 제공합니다.' },
 { q: '기존 데이터 이관이 가능한가요?', a: '기존 리뷰·고객 데이터 CSV 임포트를 지원합니다. 도입 담당자가 이관 과정을 직접 도와드려요.' },
 ]
 return (
 <aside className="bg-white rounded-[10px] p-5 sm:p-6 border border-[var(--lu-line)] shadow-none lg:sticky lg:top-6">
 <div className="flex items-center gap-2.5 mb-4">
 <div className="w-8 h-8 rounded-[6px] bg-[var(--lu-accent-soft)] flex items-center justify-center shrink-0">
 <MessageCircle size={15} strokeWidth={2} className="text-[var(--lu-accent)]" />
 </div>
 <div>
 <h2 className="text-sm sm:text-base font-semibold text-[var(--lu-ink)]">자주 묻는 질문</h2>
 <p className="text-[10px] text-[var(--lu-muted)]">문의 전에 먼저 확인해 보세요</p>
 </div>
 </div>
 <div className="space-y-2">
 {faqs.map((f, i) => (
 <div key={i} className="border border-[var(--lu-canvas)] rounded-[6px] overflow-hidden">
 <button onClick={() => setOpen(open === i ? null : i)}
 className="min-h-11 w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[var(--lu-canvas)] transition-colors">
 <span className="font-bold text-[var(--lu-ink)] text-xs sm:text-sm break-keep leading-snug">{f.q}</span>
 <Plus size={15} strokeWidth={2.25}
 className={'text-[var(--lu-muted)] shrink-0 transition-transform ' + (open === i ? 'rotate-45' : '')} />
 </button>
 {open === i && (
 <div className="px-3.5 pb-3.5 text-xs sm:text-sm text-[var(--lu-muted)] leading-relaxed border-t border-[var(--lu-canvas)] pt-3 break-keep">
 {f.a}
 </div>
 )}
 </div>
 ))}
 </div>
 <div className="mt-4 p-3.5 rounded-[6px] bg-[var(--lu-accent-soft)] border border-[#DBEAFE]">
 <p className="text-[11px] font-semibold text-[var(--lu-accent)] mb-1">원하시는 답변을 못 찾으셨나요?</p>
 <p className="text-[11px] text-[var(--lu-muted)] leading-relaxed break-keep">왼쪽 양식으로 문의하시거나 카카오톡 채널로 빠르게 상담받아 보세요.</p>
 </div>
 </aside>
 )
}

// ── 상태 뱃지 ──────────────────────────────────────────────
function StatusBadge({ status }: { status: InquiryStatus }) {
 const m = STATUS_META[status]
 const Icon = m.icon
 return (
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
 style={{ background: m.bg, color: m.color }}>
 <Icon size={11} strokeWidth={2.5} />{m.label}
 </span>
 )
}

// ── 메인 ──────────────────────────────────────────────────
export default function InquiryPage() {
 const [tab, setTab] = useState<'new' | 'history'>('new')
 const [form, setForm] = useState({ name: '', contact: '', category: '서비스문의', message: '' })
 const [submitting, setSubmitting] = useState(false)
 const [agreed, setAgreed] = useState(false)
 const [submitted, setSubmitted] = useState(false)
 const [error, setError] = useState('')
 const [myInquiries, setMyInquiries] = useState<MyInquiry[]>([])
 const [copied, setCopied] = useState(false)
 const [quoteBanner, setQuoteBanner] = useState('')
 const [active, setActive] = useState<MyInquiry | null>(null)
 const [syncing, setSyncing] = useState(false)
 const [syncedAt, setSyncedAt] = useState<string | null>(null)

 useEffect(() => {
 if (typeof window === 'undefined') return
 setMyInquiries(loadMine())
 try {
 const raw = localStorage.getItem('localution.pricing_quote')
 if (raw) {
 const q = JSON.parse(raw) as { items: { name: string; price: number }[]; subtotal: number; discountRate: number; discountAmount: number; total: number }
 if (q.items?.length > 0) {
 const lines = q.items.map((it, i) => `${i + 1}. ${it.name} ${it.price.toLocaleString()}원/월`)
 const discountText = q.discountRate > 0 ? `\n- 묶음 할인: ${Math.round(q.discountRate * 100)}% (-${q.discountAmount.toLocaleString()}원)` : ''
 const msg =
`[견적 문의] 가격 페이지에서 선택한 구성
${lines.join('\n')}

- 원가: ${q.subtotal.toLocaleString()}원${discountText}
- 월 합계: ${q.total.toLocaleString()}원 (VAT 포함)

※ 이 구성으로 시작 가능한지, 세금계산서/결제수단/도입 일정 안내 부탁드립니다.`
 setForm(p => ({ ...p, category: '서비스문의', message: msg }))
 setQuoteBanner(`가격 페이지에서 ${q.items.length}개 기능(월 ${q.total.toLocaleString()}원)을 선택하셨어요. 이름·연락처만 입력해주세요.`)
 localStorage.removeItem('localution.pricing_quote')
 }
 }
 // v1.6z+: 통계 페이지 등에서 자동 prefill (category + message)
 const prefillRaw = localStorage.getItem('localution.inquiry_prefill')
 if (prefillRaw) {
 try {
 const pf = JSON.parse(prefillRaw) as { category?: string; message?: string; source?: string }
 if (pf.message) {
 setForm(p => ({
 ...p,
 category: pf.category || p.category || '기술문의',
 message: pf.message!,
 }))
 setQuoteBanner('통계 페이지에서 발행 문제 정보를 자동 첨부했어요. 이름·연락처만 입력해주세요.')
 }
 } catch {}
 localStorage.removeItem('localution.inquiry_prefill')
 }
 } catch {}
 }, [])

 const syncFromServer = useCallback(async () => {
 const saved = loadMine()
 if (saved.length === 0) return
 setSyncing(true)
 try {
 const ids = saved.map(s => s.id).join(',')
 const res = await fetch(`/api/inquiry?mine=true&ids=${encodeURIComponent(ids)}`)
 if (!res.ok) return
 const data = await res.json()
 const serverList: MyInquiry[] = Array.isArray(data.inquiries) ? data.inquiries : []
 const merged = saved.map(local => {
 const hit = serverList.find(s => s.id === local.id)
 return hit ? { ...local, ...hit } : local
 })
 setMyInquiries(merged)
 saveMine(merged)
 setSyncedAt(new Date().toISOString())
 } catch {} finally { setSyncing(false) }
 }, [])

 useEffect(() => { syncFromServer() }, [syncFromServer])
 useEffect(() => { if (tab === 'history') syncFromServer() }, [tab, syncFromServer])

 const copyEmail = async () => {
 try {
 await navigator.clipboard.writeText(COMPANY.EMAIL)
 } catch {
 const el = document.createElement('textarea')
 el.value = COMPANY.EMAIL
 document.body.appendChild(el); el.select()
 document.execCommand('copy'); document.body.removeChild(el)
 }
 setCopied(true); setTimeout(() => setCopied(false), 2500)
 }

 const handleSubmit = async () => {
 if (!form.name || !form.message) { setError('이름과 문의 내용을 입력해 주세요.'); return }
 if (!agreed) { setError('개인정보 수집 · 이용에 동의해 주세요.'); return }
 setError(''); setSubmitting(true)
 try {
 const res = await fetch('/api/inquiry', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(form),
 })
 if (res.ok) {
 const data = await res.json()
 const saved: MyInquiry = {
 id: data.id, name: form.name, contact: form.contact,
 category: form.category, message: form.message,
 status: 'new', createdAt: new Date().toISOString(),
 reply: null, repliedAt: null, completedAt: null,
 }
 const next = [saved, ...myInquiries].slice(0, 50)
 setMyInquiries(next); saveMine(next)
 setSubmitted(true)
 setForm({ name: '', contact: '', category: '서비스문의', message: '' })
 setAgreed(false)
 } else { setError('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.') }
 } catch { setError('네트워크 오류가 발생했습니다.') }
 setSubmitting(false)
 }

 const unreadCount = myInquiries.filter(i => i.status === 'replied').length
 const historyLabel = `내 문의 내역${myInquiries.length ? ` (${myInquiries.length})` : ''}`

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)]">
 <style>{GLOBAL_STYLES}</style>
 <Sidebar />
 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<MessageCircle size={28} className="text-white" strokeWidth={2.5} />}
 title="1:1 문의"
 subtitle="궁금하신 내용을 편하게 남겨주세요 · 영업일에 접수 순서대로 답변드려요"
 variant="primary"
 />

 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full">
 {/* ── 본문 ────────────────────────────────────── */}
 <div className="">

 {/* 견적 자동 채움 배너 */}
 {quoteBanner && (
 <div className="mb-5 flex items-start gap-3 p-4 bg-[var(--lu-accent)] border border-[var(--lu-accent)]/30 rounded-[10px]"
 style={{ animation: 'slide-up 0.3s ease-out forwards' }}>
 <div className="w-9 h-9 rounded-[6px] bg-white flex items-center justify-center shrink-0 shadow-none">
 <ShoppingCart size={16} strokeWidth={2} className="text-[var(--lu-accent)]" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-[var(--lu-ink)]">견적 내용이 자동 입력됐어요</p>
 <p className="text-xs text-[var(--lu-muted)] mt-0.5 break-keep">{quoteBanner}</p>
 </div>
 </div>
 )}

 {/* 빠른 연락 카드 */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
 <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener noreferrer"
 className="flex items-center gap-3 p-4 rounded-[10px] border-2 border-[#FEE500] bg-[#FFFDE7] hover:bg-[#FEE500]/30 hover:shadow-md transition-all group active:scale-[0.98]">
 <div className="w-11 h-11 rounded-[6px] bg-[#FEE500] flex items-center justify-center shrink-0 shadow-none">
 <span className="text-[var(--lu-ink)] font-semibold text-lg leading-none">K</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-[var(--lu-ink)] text-sm">카카오톡 채널 상담</p>
 <p className="text-[11px] text-[#78350F] mt-0.5">카카오톡 채팅으로 문의</p>
 </div>
 <ArrowRight size={15} strokeWidth={2.5} className="text-[#78350F] shrink-0 group-hover:translate-x-1 transition-transform" />
 </a>

 <button onClick={copyEmail}
 className="min-h-11 flex items-center gap-3 p-4 rounded-[10px] border-2 border-[var(--lu-line)] bg-white hover:border-[var(--lu-accent)] hover:shadow-md transition-all text-left w-full group active:scale-[0.98]">
 <div className="w-11 h-11 rounded-[6px] bg-[var(--lu-accent-soft)] flex items-center justify-center shrink-0">
 <Mail size={18} strokeWidth={2} className="text-[var(--lu-accent)]" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-[var(--lu-ink)] text-sm">이메일 문의</p>
 <p className="text-[11px] text-[var(--lu-muted)] mt-0.5 truncate">{COMPANY.EMAIL} · 클릭해서 복사</p>
 </div>
 <ArrowRight size={15} strokeWidth={2.5} className="text-[var(--lu-accent)] shrink-0 group-hover:translate-x-1 transition-transform" />
 </button>
 </div>

 {/* ── 메인 2열 ──────────────────────────────── */}
 <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 sm:gap-6 items-start">

 {/* 좌: 폼 / 내역 */}
 <div>
 {/* 탭 */}
 <div className="flex gap-1.5 bg-white rounded-[10px] p-1.5 shadow-none mb-5 w-fit border border-[var(--lu-line)]">
 {([['new', '문의하기'], ['history', historyLabel]] as const).map(([t, l]) => (
 <button key={t} onClick={() => setTab(t)}
 className={`relative px-4 sm:px-5 py-2 rounded-[6px] text-xs sm:text-sm font-bold transition-colors ${tab === t ? 'bg-[var(--lu-accent)] text-white shadow-none' : 'text-[var(--lu-muted)] hover:bg-[var(--lu-canvas)]'}`}>
 {l}
 {t === 'history' && unreadCount > 0 && tab !== 'history' && (
 <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-semibold flex items-center justify-center">
 {unreadCount}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* 문의하기 폼 */}
 {tab === 'new' && (
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] shadow-none overflow-hidden">
 {submitted ? (
 <div className="text-center py-12 px-6" style={{ animation: 'slide-up 0.3s ease-out' }}>
 <div className="w-16 h-16 rounded-[10px] bg-[#D1FAE5] mx-auto mb-4 flex items-center justify-center"
 style={{ animation: 'check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
 <CheckCircle2 size={32} strokeWidth={2} className="text-[#10B981]" />
 </div>
 <h2 className="text-lg sm:text-xl font-semibold text-[var(--lu-ink)] mb-2">문의가 접수되었습니다!</h2>
 <p className="text-[var(--lu-muted)] text-sm leading-relaxed mb-6 break-keep">
 영업일에 접수 순서대로 답변드립니다.<br/>
 답변이 달리면 내 문의 내역에 자동으로 표시돼요.
 </p>
 <div className="flex gap-2.5 justify-center flex-col sm:flex-row">
 <button onClick={() => setSubmitted(false)}
 className="min-h-11 px-5 py-2.5 bg-[var(--lu-canvas)] text-[var(--lu-muted)] font-bold rounded-[6px] text-sm hover:bg-[var(--lu-line)] transition-colors">
 추가 문의하기
 </button>
 <button onClick={() => { setTab('history'); setSubmitted(false) }}
 className="min-h-11 px-5 py-2.5 bg-[var(--lu-accent)] text-white font-bold rounded-[6px] text-sm hover:bg-[var(--lu-accent-hover)] transition-colors">
 내 문의 내역 보기
 </button>
 </div>
 </div>
 ) : (
 <div className="p-5 sm:p-6 space-y-5">
 {/* 분류 선택 */}
 <div>
 <label className="text-xs sm:text-sm font-semibold text-[var(--lu-ink)] block mb-2.5">문의 분류</label>
 <div className="flex flex-wrap gap-2">
 {CATEGORIES.map(cat => {
 const active = form.category === cat.value
 return (
 <button key={cat.value} onClick={() => setForm(p => ({ ...p, category: cat.value }))}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all border-2 ${
 active ? 'text-white border-transparent shadow-none' : 'border-[var(--lu-line)] text-[var(--lu-muted)] hover:border-[var(--lu-accent)] bg-white'
 }`}
 style={active ? { background: cat.color, borderColor: cat.color } : {}}>
 <cat.Icon size={13} strokeWidth={2.25} />
 {cat.label}
 </button>
 )
 })}
 </div>
 </div>

 {/* 이름 + 연락처 */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div>
 <label className="text-xs sm:text-sm font-semibold text-[var(--lu-ink)] block mb-1.5">
 이름 <span className="text-red-500">*</span>
 </label>
 <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
 placeholder="홍길동"
 className="min-h-11 w-full border border-[var(--lu-line)] rounded-[6px] px-4 py-3 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors" />
 </div>
 <div>
 <label className="text-xs sm:text-sm font-semibold text-[var(--lu-ink)] block mb-1.5">연락처</label>
 <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
 placeholder="010-0000-0000 또는 이메일"
 className="min-h-11 w-full border border-[var(--lu-line)] rounded-[6px] px-4 py-3 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors" />
 </div>
 </div>

 {/* 문의 내용 */}
 <div>
 <label className="text-xs sm:text-sm font-semibold text-[var(--lu-ink)] block mb-1.5">
 문의 내용 <span className="text-red-500">*</span>
 </label>
 <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
 rows={7} placeholder="문의하실 내용을 자세히 작성해 주세요. 자세할수록 더 정확한 답변을 드릴 수 있어요."
 className="w-full border border-[var(--lu-line)] rounded-[6px] px-4 py-3 text-base leading-relaxed focus:outline-none focus:border-[var(--lu-accent)] transition-colors resize-none" />
 <p className="text-[11px] text-[#B0B8C1] mt-1 text-right">{form.message.length}자</p>
 </div>

 {error && (
 <p className="text-red-500 text-xs sm:text-sm bg-red-50 border border-red-100 rounded-[6px] px-4 py-3 break-keep">
 {error}
 </p>
 )}

 {/* 개인정보 수집 · 이용 동의 (필수) */}
 <div className="rounded-[6px] border border-[var(--lu-line)] bg-[var(--lu-canvas)] px-4 py-3">
 <label className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--lu-ink)] cursor-pointer">
 <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required aria-required="true" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--lu-accent)]" />
 <span className="font-semibold break-keep">[필수] 개인정보 수집 · 이용에 동의합니다</span>
 </label>
 <p className="mt-2 pl-[26px] text-[11px] leading-relaxed text-[var(--lu-muted)] break-keep">
 수집 항목: 이름, 연락처(입력한 경우), 문의 내용 · 목적: 문의 확인과 답변 · 보유 기간: 문의 처리 완료 후 3년(전자상거래법상 소비자 불만 · 분쟁 처리 기록). 동의하지 않으면 이 화면에서 접수할 수 없으며, 카카오톡 채널이나 이메일로 문의할 수 있어요.{' '}
 <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--lu-accent)] underline">개인정보처리방침</a>
 </p>
 </div>

 <button onClick={handleSubmit} disabled={submitting || !agreed}
 className={`w-full py-3.5 rounded-[6px] font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
 submitting || !agreed
 ? 'bg-[#93C5FD] cursor-not-allowed text-white'
 : 'bg-[var(--lu-accent)] text-white hover:bg-[var(--lu-accent-hover)] shadow-[0_4px_16px_rgba(49,130,246,0.28)] active:scale-[0.99]'
 }`}>
 {submitting
 ? <><RefreshCw size={15} className="animate-spin" /> 접수 중...</>
 : <><Send size={15} strokeWidth={2.5} /> 문의 접수하기</>}
 </button>

 <div className="pt-1 border-t border-[var(--lu-canvas)] flex items-center justify-center gap-3 text-xs text-[var(--lu-muted)]">
 <span className="inline-flex items-center gap-1">
 <Mail size={11} strokeWidth={2.25} /> 이메일 직접 문의
 </span>
 <button onClick={copyEmail} className="min-h-11 font-bold text-[var(--lu-accent)] hover:underline">{COMPANY.EMAIL}</button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* 내 문의 내역 */}
 {tab === 'history' && (
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] shadow-none">
 <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--lu-canvas)]">
 <div>
 <p className="text-sm font-semibold text-[var(--lu-ink)]">내 문의 내역</p>
 <p className="text-[11px] text-[var(--lu-muted)] mt-0.5 break-keep">
 이 기기에서 접수한 문의{syncedAt && <span> · 동기화 {formatDate(syncedAt)}</span>}
 </p>
 </div>
 <button onClick={() => syncFromServer()} disabled={syncing || myInquiries.length === 0}
 className="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[var(--lu-canvas)] text-[var(--lu-muted)] text-xs font-bold hover:bg-[var(--lu-line)] disabled:opacity-50 transition-colors">
 <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
 {syncing ? '동기화 중…' : '새로고침'}
 </button>
 </div>

 {myInquiries.length === 0 ? (
 <div className="text-center py-14 px-6 flex flex-col items-center">
 {/* SVG 빈 상태 — 편지봉투 일러스트 */}
 <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-4 opacity-70" aria-hidden="true">
 <rect x="6" y="18" width="60" height="40" rx="6" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2" />
 <path d="M6 24l30 20 30-20" stroke="#16685D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
 <circle cx="54" cy="20" r="10" fill="#DBEAFE" />
 <path d="M49 20h10M54 15v10" stroke="#16685D" strokeWidth="2" strokeLinecap="round" />
 </svg>
 <p className="font-bold text-[var(--lu-ink)] text-sm mb-1">문의 내역이 없습니다</p>
 <p className="text-xs text-[var(--lu-muted)] mb-4 break-keep">궁금한 점이 있으시면 언제든 문의해 주세요.<br/>영업일에 접수 순서대로 답변드립니다.</p>
 <button onClick={() => setTab('new')}
 className="min-h-11 px-5 py-2.5 bg-[var(--lu-accent)] text-white font-bold rounded-[6px] text-sm hover:bg-[var(--lu-accent-hover)] transition-colors">
 첫 문의 남기기
 </button>
 </div>
 ) : (
 <div className="divide-y divide-[var(--lu-canvas)]">
 {myInquiries.map(inq => (
 <button key={inq.id} onClick={() => setActive(inq)}
 className="min-h-11 w-full text-left px-5 sm:px-6 py-4 hover:bg-[#FAFBFF] transition-colors">
 <div className="flex items-center gap-2 flex-wrap mb-1.5">
 <StatusBadge status={inq.status} />
 <span className="text-[10px] font-bold text-[var(--lu-muted)] bg-[var(--lu-canvas)] px-2 py-0.5 rounded-full">{inq.category}</span>
 <span className="text-[10px] text-[#B0B8C1] ml-auto shrink-0">{formatDate(inq.createdAt)}</span>
 </div>
 <p className="text-xs sm:text-sm text-[var(--lu-ink)] line-clamp-2 whitespace-pre-wrap break-keep">{inq.message}</p>
 {inq.reply && (
 <div className="mt-2 flex items-start gap-2 bg-[#F0F7FF] rounded-[6px] px-3 py-2">
 <MessageSquare size={11} strokeWidth={2.25} className="text-[var(--lu-accent)] mt-0.5 shrink-0" />
 <div className="min-w-0">
 <div className="text-[10px] font-semibold text-[var(--lu-accent)] mb-0.5">관리자 답변</div>
 <div className="text-[11px] text-[#1E3A8A] line-clamp-1 break-keep">{inq.reply}</div>
 </div>
 </div>
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 {/* 우: FAQ */}
 <FAQSection />
 </div>
 </div>

 {/* 상세 모달 */}
 {active && (
 <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6"
 onClick={() => setActive(null)}>
 <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
 onClick={e => e.stopPropagation()}>
 {/* 모달 헤더 */}
 <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[var(--lu-canvas)] flex items-start justify-between gap-3 sticky top-0 bg-white z-10 rounded-t-3xl">
 <div className="flex-1">
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <StatusBadge status={active.status} />
 <span className="text-[10px] font-bold text-[var(--lu-muted)] bg-[var(--lu-canvas)] px-2 py-0.5 rounded-full">{active.category}</span>
 </div>
 <p className="text-[11px] text-[var(--lu-muted)]">
 접수 {formatDate(active.createdAt)}
 {active.repliedAt && ` · 답변 ${formatDate(active.repliedAt)}`}
 {active.completedAt && ` · 완료 ${formatDate(active.completedAt)}`}
 </p>
 </div>
 <button onClick={() => setActive(null)} className="min-h-11 p-1.5 rounded-lg hover:bg-[var(--lu-canvas)] text-[var(--lu-muted)] transition-colors shrink-0">
 <X size={18} strokeWidth={2} />
 </button>
 </div>

 <div className="px-5 sm:px-6 py-5 space-y-4">
 <div>
 <p className="text-[11px] font-semibold text-[var(--lu-muted)] mb-2">내 문의 내용</p>
 <div className="text-xs sm:text-sm text-[var(--lu-ink)] leading-relaxed whitespace-pre-wrap bg-[var(--lu-canvas)] rounded-[6px] p-4 break-keep">
 {active.message}
 </div>
 </div>
 {active.reply ? (
 <div>
 <div className="flex items-center gap-1.5 mb-2">
 <div className="w-5 h-5 rounded-full bg-[var(--lu-accent-soft)] flex items-center justify-center shrink-0">
 <Headphones size={11} strokeWidth={2.5} className="text-[var(--lu-accent)]" />
 </div>
 <span className="text-[11px] font-semibold text-[var(--lu-accent)]">관리자 답변</span>
 </div>
 <div className="text-xs sm:text-sm text-[#1E3A8A] leading-relaxed whitespace-pre-wrap bg-[var(--lu-accent-soft)] rounded-[6px] p-4 break-keep">
 {active.reply}
 </div>
 {active.status === 'completed' && (
 <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#065F46] bg-[#D1FAE5] rounded-[6px] py-2.5">
 <CheckCircle2 size={12} strokeWidth={2.5} />
 이 문의는 처리 완료되었습니다
 </div>
 )}
 </div>
 ) : (
 <div className="text-sm text-[var(--lu-muted)] bg-[var(--lu-canvas)] rounded-[6px] p-4 text-center leading-relaxed break-keep">
 아직 답변이 작성되지 않았습니다.<br />
 영업일에 접수 순서대로 답변드릴게요.
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 </main>
 <Footer />
 </div>

 {/* 이메일 복사 토스트 */}
 {copied && (
 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
 style={{ animation: 'slide-up 0.25s ease-out' }}>
 <div className="flex items-center gap-2.5 px-5 py-3 bg-[var(--lu-ink)] text-white rounded-[10px] shadow-2xl text-sm font-bold whitespace-nowrap">
 <CheckCircle2 size={15} strokeWidth={2.25} className="text-[#10B981]" />
 이메일 주소가 복사되었습니다
 <span className="text-[var(--lu-muted)] text-xs">{COMPANY.EMAIL}</span>
 </div>
 </div>
 )}
 </div>
 )
}
