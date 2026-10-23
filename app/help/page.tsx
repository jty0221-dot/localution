'use client'

// ============================================================
// /help — 사장님 도움말 & 시작 가이드 센터
// · 5분 시작 가이드
// · 기능별 사용법 (검색 가능)
// · 자주 묻는 질문
// · 1:1 문의 연결
// ============================================================
import { useState, useMemo } from 'react'
import Link from 'next/link'
import TopNav from '../components/TopNav'
import TaskFinder from '../components/help/TaskFinder'
import Footer from '../components/Footer'
import HarangMarketingPopup from '../components/HarangMarketingPopup'
import {
 HelpCircle, Search, ChevronDown, ChevronRight,
 Rocket, MessageSquare, QrCode, Users, Coins, Megaphone,
 Sparkles, BookOpen, ArrowRight, Phone, Mail, Lightbulb,
 Shield, Zap, Settings,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Guide = {
 id: string
 category: string
 title: string
 steps: string[]
 link?: { href: string; label: string }
}

const QUICK_START: Guide[] = [
 {
 id: 'qs-store',
 category: '시작',
 title: '1) 매장 정보 등록',
 steps: [
 '매장 관리에서 등록할 매장의 기본 정보를 확인하세요.',
 '네이버 플레이스 주소를 입력했다면 불러온 매장명과 주소를 실제 정보와 대조하세요.',
 '대표 메뉴나 서비스와 실제 강점을 추가하세요.',
 '저장 결과를 확인하고 다시 열어 입력 내용이 남아 있는지 확인하세요.',
 ],
 link: { href: '/settings/profile', label: '매장 정보 등록 →' },
 },
 {
 id: 'qs-platform',
 category: '시작',
 title: '2) 플랫폼 연결 상태 확인',
 steps: [
 '플랫폼 연결 화면에서 사용 중인 플랫폼을 선택하세요.',
 '선택한 플랫폼에 표시된 연결 방법과 필요한 관리 권한을 확인하세요.',
 '연결 결과와 최근 수집 상태를 확인하세요.',
 '권한이나 세션 만료 안내가 나오면 해당 플랫폼의 다시 연결 절차를 진행하세요.',
 ],
 link: { href: '/my/platforms', label: '플랫폼 연결하기 →' },
 },
 {
 id: 'qs-review',
 category: '시작',
 title: '3) 리뷰를 확인하고 답글 준비',
 steps: [
 '리뷰 관리에서 연결된 플랫폼과 수집된 리뷰를 확인하세요.',
 '매장에 맞는 말투를 선택하고 답글 초안을 만드세요.',
 '고객이 쓴 원문과 사실관계를 대조한 뒤 초안을 수정하세요.',
 '등록을 진행했다면 도구의 결과와 실제 플랫폼의 답글을 확인하세요.',
 ],
 link: { href: '/review-admin', label: '리뷰 답글 시작 →' },
 },
 {
 id: 'qs-qr',
 category: '시작',
 title: '4) 고객에게 보여줄 QR 안내 준비',
 steps: [
 'QR 관리에서 매장 정보와 QR의 용도를 확인하세요.',
 '안내할 내용과 연결할 주소를 입력하세요.',
 '저장 성공을 확인한 뒤 QR 이미지를 내려받으세요.',
 '휴대전화로 직접 스캔해 의도한 매장과 안내 화면으로 이동하는지 확인하세요.',
 ],
 link: { href: '/qr-admin', label: 'QR 만들기 →' },
 },
]

const FEATURE_GUIDES: Guide[] = [
 {
 id: 'fg-stats',
 category: '리뷰',
 title: '답글 발행 통계 보기',
 steps: [
 '리뷰 관리 → "답글 발행 통계" 클릭',
 '기간 선택 (7일 / 30일 / 90일)',
 '플랫폼별 답변률·자동 발행 성공률·평균 소요 시간 확인',
 '문제가 반복되면 "문의 보내기" 버튼으로 통계 자동 첨부',
 ],
 link: { href: '/review-admin/stats', label: '통계 보기 →' },
 },
 {
 id: 'fg-keyword',
 category: '마케팅',
 title: '내 매장 키워드 순위 확인',
 steps: [
 '마케팅 → "플레이스(실시간)" 클릭',
 '지역 / 업종 / 키워드 선택',
 '실시간 검색 결과에서 내 매장 순위 확인',
 '주기적으로 체크하면 SEO 효과 측정 가능',
 ],
 link: { href: '/marketing/keyword-rank', label: '순위 확인 →' },
 },
 {
 id: 'fg-blog',
 category: '마케팅',
 title: '블로그 글 AI 자동 작성',
 steps: [
 '마케팅 → "블로그 글 작성"',
 '주제 / 키워드 / 페르소나 입력',
 '"AI 글쓰기" 클릭 → 3000자 SEO 최적화 글 자동 완성',
 '복사해서 네이버 블로그에 붙여넣기',
 ],
 link: { href: '/marketing/blog-post', label: '블로그 작성 →' },
 },
 {
 id: 'fg-instagram',
 category: '마케팅',
 title: '인스타그램 계정 연결과 게시',
 steps: [
 '마케팅 → 인스타그램 피드 작성에서 프로페셔널 계정을 연결하세요.',
 '게시할 JPEG 사진 한 장 또는 MP4 릴스를 선택하고 공개 저장에 동의하세요.',
 '실제 매장 소식으로 캡션 초안을 만들고 내용을 검토하세요.',
 '게시 준비 후 계정과 내용을 확인하고 직접 게시하세요. 게시 기록에서 결과를 확인하세요.',
 ],
 link: { href: '/marketing/instagram-feed', label: '인스타 발행 →' },
 },
 {
 id: 'fg-events',
 category: '마케팅',
 title: '매장 이벤트 만들기',
 steps: [
 '마케팅 → "이벤트·프로모션"',
 '템플릿 선택 (오픈 / 시즌 / 단골 / 타임세일 / 협업)',
 '제목 / 시작·종료일 / 혜택 / 대상 입력',
 '저장 → 진행 중 / 예정 / 종료 자동 분류',
 ],
 link: { href: '/marketing/events', label: '이벤트 만들기 →' },
 },
 {
 id: 'fg-customers',
 category: '고객',
 title: '단골·VIP 고객 관리',
 steps: [
 '고객 관리 메뉴 클릭',
 '직접 추가 또는 QR 스탬프카드로 자동 등록',
 'VIP / 단골 / 신규 자동 분류',
 '단체 메시지 보내기 (이름 자동 치환)',
 ],
 link: { href: '/customers', label: '고객 관리 →' },
 },
 {
 id: 'fg-reservations',
 category: '운영',
 title: '예약·일정 관리',
 steps: [
 '예약·일정 메뉴 클릭',
 '"+ 예약 추가" → 날짜 / 시간 / 인원 입력',
 '캘린더 뷰에서 한눈에 확인',
 '취소 / 완료 상태 변경 가능',
 ],
 link: { href: '/reservations', label: '예약 관리 →' },
 },
]

const FAQS = [
 {
 q: '비밀번호가 안전한가요?',
 a: '네이버·배민·요기요 등 플랫폼 비밀번호는 AES-256-GCM으로 암호화되어 서버에 보관됩니다. 답글 발행 외 다른 용도로 절대 사용되지 않으며, 연결 해제 시 즉시 파기됩니다.',
 },
 {
 q: 'AI가 만든 답글이 어색하지 않나요?',
 a: '매장명·강점·메뉴·사장님 이름까지 학습해서 자연스럽게 만듭니다. 톤 11종 + 사장님 맞춤 톤까지 지원하며, 발행 전 검토·수정이 가능합니다.',
 },
 {
 q: '리뷰가 새로 달리면 알 수 있나요?',
 a: '15분마다 자동 수집해서 별점 1-2점 부정 리뷰는 우선 알림으로 보내드립니다. 웹푸시와 카카오톡으로 받을 수 있어요.',
 },
 {
 q: '여러 매장을 한 계정에서 관리할 수 있나요?',
 a: '네. Pro 플랜에서는 매장별 권한 분리도 됩니다. 1인 마케팅 대행사·프랜차이즈 본부 사장님들이 자주 쓰세요.',
 },
 {
 q: '해지가 어렵거나 자동결제가 무서워요',
 a: '해지는 언제든 1:1 문의로 접수해 처리해요. 당월 남은 일수만큼 일할 환불됩니다.',
 },
 {
 q: '배민·요기요 30일 정책이 뭔가요?',
 a: '배민·요기요는 리뷰 등록 후 30일이 지나면 사장님 답글 등록이 막혀요. 그래서 새 리뷰는 알림 받자마자 답글 다는 게 좋아요. 통계 페이지에서 30일 만료 건수 확인 가능합니다.',
 },
]

// 카테고리별 가이드 anchor — Coins(정산) 제거 (settlement 페이지가 redirect-only)
const SECTIONS = [
 { id: 'quick',     label: '처음 시작 가이드', Icon: Rocket,        color: 'from-[var(--lu-accent)] to-[var(--lu-accent-hover)]' },
 { id: 'features',  label: '기능별 사용법',   Icon: MessageSquare, color: 'from-[#F59E0B] to-[#D97706]' },
 { id: 'faq',       label: '자주 묻는 질문',  Icon: Megaphone,     color: 'from-[#EC4899] to-[#BE185D]' },
 { id: 'inquiry',   label: '1:1 문의',        Icon: Users,         color: 'from-[#10B981] to-[#059669]' },
]

export default function HelpPage() {
 const [search, setSearch] = useState('')
 const [openId, setOpenId] = useState<string | null>(null)
 const [openFaq, setOpenFaq] = useState<number | null>(null)

 const allGuides = useMemo(() => [...QUICK_START, ...FEATURE_GUIDES], [])
 const filtered = useMemo(() => {
 if (!search.trim()) return allGuides
 const q = search.toLowerCase()
 return allGuides.filter(g =>
 g.title.toLowerCase().includes(q) ||
 g.category.toLowerCase().includes(q) ||
 g.steps.some(s => s.toLowerCase().includes(q))
 )
 }, [allGuides, search])

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)]">
 <TopNav />
 <div className="flex min-h-screen flex-col pt-20">
 <header className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
 <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><HelpCircle size={16} className="text-[var(--lu-accent)]" strokeWidth={1.8} aria-hidden="true" /></div>
 <h1 className="text-xl font-semibold text-[var(--lu-ink)] md:text-2xl">가게 운영에 필요한 도구와 사용 안내</h1>
 <p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">처음 시작하는 분도, 여러 매장을 관리하는 분도 지금 필요한 작업부터 선택하세요.</p>
 </header>

 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-5 md:space-y-6">

 <section className="lu-panel p-5"><h2 className="text-xl font-semibold">기능을 영상으로 먼저 살펴보세요</h2><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">준비물과 사용 순서를 확인하고, 필요한 도구로 바로 이동하세요.</p><Link href="/help/videos" className="lu-primary mt-4 inline-flex items-center">기능별 영상 설명 보기</Link></section><TaskFinder />

 {/* 검색바 */}
 <div className="bg-white rounded-[10px] shadow-none p-3 md:p-4 flex items-center gap-2">
 <Search size={16} className="text-[var(--lu-muted)] flex-shrink-0" strokeWidth={2.5} />
 <input
 id="help-guide-search"
 aria-label="기능별 사용법 검색"
 type="search"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="궁금한 기능을 검색하세요 (예: 답글, 키워드, QR)"
 className="min-w-0 flex-1 text-base bg-transparent focus:outline-none text-[var(--lu-ink)] placeholder:text-[var(--lu-muted)]"
 />
 {search && (
 <button onClick={() => setSearch('')} className="min-h-[44px] rounded-[6px] px-3 text-sm text-[var(--lu-muted)] hover:text-[var(--lu-accent)]">
 지우기
 </button>
 )}
 </div>

 {/* 카테고리 빠른 이동 */}
 {!search && (
 <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
 {SECTIONS.map(s => (
 <a key={s.id} href={`#${s.id}`}
 className="flex flex-col items-center gap-1.5 p-3 rounded-[6px] bg-white border border-[#F2F4F6] hover:border-[var(--lu-accent)] hover:bg-[#FAFBFF] transition-all">
 <div className={`w-9 h-9 rounded-[6px] bg-[var(--lu-accent-soft)] flex items-center justify-center shadow-none`}>
 <s.Icon size={15} className="text-[var(--lu-accent)]" strokeWidth={1.8} />
 </div>
 <p className="text-[11px] font-bold text-[var(--lu-ink)] text-center leading-tight">{s.label}</p>
 </a>
 ))}
 </div>
 )}

 {/* 5분 시작 가이드 */}
 <section id="quick">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent-soft)] flex items-center justify-center shadow-none">
 <Rocket size={14} className="text-[var(--lu-accent)]" strokeWidth={1.8} />
 </div>
 <h2 className="text-base md:text-lg font-bold text-[var(--lu-ink)]">처음이신가요? 시작 순서부터 확인하세요</h2>
 </div>
 <div className="space-y-2">
 {(search ? filtered : QUICK_START).filter(g => g.category === '시작').map(g => (
 <GuideCard key={g.id} guide={g} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? null : g.id)} />
 ))}
 {search && filtered.filter(g => g.category === '시작').length === 0 && (
 <p className="text-xs text-[var(--lu-muted)] text-center py-4">검색 결과 없음</p>
 )}
 </div>
 </section>

 {/* 기능별 사용법 */}
 <section id="features" className="scroll-mt-20">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent-soft)] flex items-center justify-center shadow-none">
 <BookOpen size={14} className="text-[var(--lu-accent)]" strokeWidth={1.8} />
 </div>
 <h2 className="text-base md:text-lg font-bold text-[var(--lu-ink)]">기능별 사용법</h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {(search ? filtered : FEATURE_GUIDES).filter(g => g.category !== '시작').map(g => (
 <GuideCard key={g.id} guide={g} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? null : g.id)} />
 ))}
 {search && filtered.filter(g => g.category !== '시작').length === 0 && (
 <p className="text-xs text-[var(--lu-muted)] text-center py-4 col-span-2">검색 결과 없음</p>
 )}
 </div>
 </section>

 {/* FAQ */}
 {!search && (
 <section id="faq" className="scroll-mt-20">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent-soft)] flex items-center justify-center shadow-none">
 <Lightbulb size={14} className="text-[var(--lu-accent)]" strokeWidth={1.8} />
 </div>
 <h2 className="text-base md:text-lg font-bold text-[var(--lu-ink)]">자주 묻는 질문</h2>
 </div>
 <div className="bg-white rounded-[10px] shadow-none overflow-hidden divide-y divide-[#F2F4F6]">
 {FAQS.map((f, i) => {
 const isOpen = openFaq === i
 return (
 <div key={i}>
 <button onClick={() => setOpenFaq(isOpen ? null : i)}
 className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#FAFBFF] transition-colors">
 <span className="text-xs font-semibold text-[var(--lu-accent)] flex-shrink-0">Q.</span>
 <span className="flex-1 text-sm font-bold text-[var(--lu-ink)]">{f.q}</span>
 {isOpen ? <ChevronDown size={14} className="text-[var(--lu-muted)]" strokeWidth={2.5} />
 : <ChevronRight size={14} className="text-[var(--lu-muted)]" strokeWidth={2.5} />}
 </button>
 {isOpen && (
 <div className="px-4 pb-3 pt-1 bg-[#FAFBFF]">
 <p className="text-xs md:text-sm text-[var(--lu-muted)] leading-relaxed pl-4">{f.a}</p>
 </div>
 )}
 </div>
 )
 })}
 </div>
 </section>
 )}

 {/* 1:1 문의 CTA */}
 {!search && (
 <section id="inquiry" className="scroll-mt-20">
 <div className="rounded-[10px] shadow-none bg-[var(--lu-accent-soft)] border border-[#DBEAFE] p-5 flex items-start gap-4">
 <div className="w-12 h-12 rounded-[10px] bg-[var(--lu-accent-soft)] flex items-center justify-center flex-shrink-0 shadow-none">
 <Mail size={20} className="text-[var(--lu-accent)]" strokeWidth={1.8} />
 </div>
 <div className="flex-1">
 <h3 className="text-sm md:text-base font-bold text-[var(--lu-ink)] mb-1">
 여기 없는 질문이 있으신가요?
 </h3>
 <p className="text-xs md:text-sm text-[var(--lu-muted)] mb-3 leading-relaxed">
 1:1 문의로 보내주시면 평일 24시간 이내 답변 드려요. 사용 중 막히는 부분, 새로 만들어주셨으면 하는 기능, 뭐든 환영합니다.
 </p>
 <Link href="/inquiry"
 className="inline-flex items-center gap-1.5 bg-[var(--lu-accent)] text-white text-xs md:text-sm font-bold px-4 py-2 rounded-[6px] hover:bg-[var(--lu-accent-hover)] transition-colors shadow-none">
 1:1 문의 보내기
 <ArrowRight size={14} strokeWidth={2.5} />
 </Link>
 </div>
 </div>
 </section>
 )}

 </main>
 <Footer />
 <HarangMarketingPopup />
 </div>
 </div>
 )
}

function GuideCard({ guide, open, onToggle }: { guide: Guide; open: boolean; onToggle: () => void }) {
 return (
 <div className="bg-white rounded-[10px] shadow-none overflow-hidden border border-transparent hover:border-[var(--lu-accent)]/20 transition-colors">
 <button onClick={onToggle}
 className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#FAFBFF] transition-colors">
 <span className="text-[10px] font-bold text-[var(--lu-accent)] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full flex-shrink-0">
 {guide.category}
 </span>
 <span className="flex-1 text-sm font-bold text-[var(--lu-ink)] truncate">{guide.title}</span>
 {open ? <ChevronDown size={14} className="text-[var(--lu-muted)]" strokeWidth={2.5} />
 : <ChevronRight size={14} className="text-[var(--lu-muted)]" strokeWidth={2.5} />}
 </button>
 {open && (
 <div className="px-4 pb-4 pt-0 space-y-1.5">
 <ol className="space-y-1.5 text-xs md:text-sm text-[var(--lu-muted)] leading-relaxed list-decimal list-inside">
 {guide.steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
 </ol>
 {guide.link && (
 <Link href={guide.link.href}
 className="inline-flex items-center gap-1 text-xs font-bold text-[var(--lu-accent)] hover:text-[var(--lu-accent-hover)] mt-2">
 {guide.link.label}
 </Link>
 )}
 </div>
 )}
 </div>
 )
}
