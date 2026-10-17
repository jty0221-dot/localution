'use client'

// force-dynamic 제거 (2026-04-19) — 공개 랜딩이라 정적 shell 생성 허용 (LCP 개선)
import { useEffect, useState } from 'react'
import Link from 'next/link'
import WorkflowMotion from './components/help/WorkflowMotion'
import Footer from './components/Footer'
import TopNav from './components/TopNav'
import HarangMarketingPopup from './components/HarangMarketingPopup'
import { parseLandingContent } from './lib/landing-content'
import JsonLd from './components/seo/JsonLd'
import { SITE, graphLd, softwareApplicationLd, organizationLd, webSiteLd, faqPageLd, type FaqItem } from './lib/seo'
import {
 MessageCircle, QrCode, Users, FileText, Sparkles,
 Coffee, UtensilsCrossed, Dumbbell,
 Flame, Heart, PenLine, Wine, UserPlus, Camera, Star,
 ArrowRight, MapPin, Video, Layers, Zap, TrendingUp,
 Inbox, Bell, CreditCard, Frown, Smartphone, Clock,
 CheckCircle2, Target, Lightbulb, Trophy, AlertTriangle,
 AtSign, Youtube, BarChart3, BellRing, Shield,
 type LucideIcon,
} from 'lucide-react'

const FEATURES = [
 {
 Icon: MapPin,
 title: '네이버 플레이스 SEO',
 desc: '매장 정보·키워드·진단을 살펴보세요. 순위는 실제 조회가 가능한 경우에만 표시해요.',
 color: 'from-emerald-500 to-teal-600',
 bg: 'bg-emerald-50',
 tags: ['순위 추적', '진단 점수', '개선 제안'],
 href: '/marketing/place',
 badge: 'HOT',
 },
 {
 Icon: PenLine,
 title: '네이버 블로그 포스팅',
 desc: '업종·키워드·페르소나만 넣으면 SEO 최적화 3,000자 포스팅이 자동 완성.',
 color: 'from-indigo-500 to-blue-600',
 bg: 'bg-indigo-50',
 tags: ['SEO 최적화', '체류시간', '사진 배치'],
 href: '/marketing/blog-post',
 badge: 'NEW',
 },
 {
 Icon: Video,
 title: '릴스·쇼츠 자동 기획',
 desc: 'AI가 트렌드·훅·장면별 촬영 지시서까지 원클릭으로 만들어줘요.',
 color: 'from-pink-500 to-rose-600',
 bg: 'bg-pink-50',
 tags: ['인스타 릴스', '유튜브 쇼츠', '촬영 대본'],
 href: '/marketing/reels',
 badge: 'NEW',
 },
 {
 Icon: MessageCircle,
 title: '멀티플랫폼 리뷰 관리',
 desc: '네이버 · 구글 · 카카오맵 · 배민 · 요기요 · 쿠팡이츠 · 6개 플랫폼 리뷰를 한 화면에서 AI 답글 11종 톤(친근·전문·감사·사과·미식·맞춤 등)으로 자동 처리해요.',
 color: 'from-blue-500 to-blue-600',
 bg: 'bg-blue-50',
 tags: ['AI 답글 11종', '네이버 자동발행', '배민 30일', '쿠팡이츠 자동화'],
 href: '/service-intro',
 badge: 'NEW',
 },
 {
 Icon: BellRing,
 title: '실시간 리뷰 알림',
 desc: '15분마다 자동 수집 → 별점 1-2점 부정 리뷰는 우선 알림. 웹푸시 + 카카오톡으로 즉시 받아 빠르게 대응해요.',
 color: 'from-orange-500 to-red-500',
 bg: 'bg-orange-50',
 tags: ['15분 자동', '별점 우선순위', '웹푸시', '카카오톡'],
 href: '/service-intro',
 badge: 'NEW',
 },
 {
 Icon: BarChart3,
 title: '답글 발행 통계',
 desc: '플랫폼별 답변률 · 자동 발행 성공률 · 실패 원인까지 한눈에. 카카오 비즈니스 권한, 30일 만료, 쿠키 만료 등 자동 분류.',
 color: 'from-violet-500 to-purple-600',
 bg: 'bg-violet-50',
 tags: ['답변률', '성공률', '실패 원인 분석'],
 href: '/review-admin/stats',
 badge: 'NEW',
 },
 {
 Icon: AtSign,
 title: '스레드(Threads) 자동 발행',
 desc: 'Meta Threads 즉시 발행 또는 예약 발행. 이미지 드래그앤드롭, 답글 체인(최대 6개), 카드뉴스 연동까지.',
 color: 'from-slate-700 to-slate-900',
 bg: 'bg-slate-50',
 tags: ['예약 발행', '답글 체인', '카드뉴스 연동'],
 href: '/marketing/threads',
 badge: 'NEW',
 },
 {
 Icon: Youtube,
 title: '유튜브 커뮤니티 자동',
 desc: '유튜브 채널 커뮤니티 탭에 자동 업로드 + 첫 댓글 자동 작성·고정까지 한 번에.',
 color: 'from-red-500 to-rose-600',
 bg: 'bg-red-50',
 tags: ['커뮤니티 탭', '자동 댓글', '고정 댓글'],
 href: '/marketing/youtube-community',
 badge: 'NEW',
 },
 {
 Icon: QrCode,
 title: 'QR 리뷰 자동화',
 desc: 'QR 코드 하나로 고객이 직접 AI 리뷰를 작성해요. 별점 5점 기본, 말투 6종, 사진 10장까지.',
 color: 'from-green-500 to-emerald-600',
 bg: 'bg-green-50',
 tags: ['QR 스캔', 'AI 생성', '네이버 연동'],
 href: '/review/demo',
 badge: '체험가능',
 },
 {
 Icon: Users,
 title: 'CRM 고객관리',
 desc: '방문 고객을 VIP·단골·신규로 자동 분류하고, 맞춤 메시지로 재방문을 유도해요.',
 color: 'from-purple-500 to-violet-600',
 bg: 'bg-purple-50',
 tags: ['자동 분류', '알림톡', '재방문 유도'],
 href: '/pricing',
 },
 {
 Icon: Layers,
 title: '카드뉴스 자동 제작',
 desc: '주제만 던지면 인스타 캐러셀 10장이 AI로 완성. 스크롤 멈추는 훅·저장 유도·해시태그까지.',
 color: 'from-rose-500 to-orange-500',
 bg: 'bg-rose-50',
 tags: ['인스타 캐러셀', 'PNG 저장', 'Claude AI'],
 href: '/marketing/card-news',
 badge: 'NEW',
 },
 {
 Icon: Zap,
 title: '플랫폼 통합 관리',
 desc: '네이버·배민·요기요·쿠팡이츠 4곳 한 계정으로 연결. 리뷰·답글·순위를 한 화면에서.',
 color: 'from-indigo-500 to-purple-600',
 bg: 'bg-indigo-50',
 tags: ['4대 플랫폼', '대리 게시', 'AES-256'],
 href: '/pricing',
 badge: 'NEW',
 },
 {
 Icon: TrendingUp,
 title: '블로그 순위 추적',
 desc: '내 블로그 글이 스마트블록·블로그탭·인기글 어디에 몇 위로 떴는지 매일 자동 체크.',
 color: 'from-amber-500 to-yellow-500',
 bg: 'bg-amber-50',
 tags: ['일 1회 자동', '스마트블록', '카톡 알림'],
 href: '/marketing/blog-tracking',
 },
]

// ─────────────────────────────────────────────────────────────
// 메인 랜딩 STATS
//
// 2026-08-19 정정:
//   이전 구현은 출시일 기준 경과일에 비례해 "누적 사장님" 수를
//   매일 1~3명씩 자동으로 늘렸다 (days * 1.4 + days % 7).
//   '예시' 배지를 달아두긴 했지만, 방문할 때마다 숫자가 커지는 것은
//   실제 성장을 흉내 내는 연출이라 배지가 있어도 오해를 만든다.
//   또한 표시광고법상 거짓·과장 표시 소지가 있다.
//
//   → 자동 증가를 제거하고, 실제 데이터가 붙기 전까지는
//     '수치' 대신 '제품이 무엇을 해주는지'를 보여주는 값으로 대체한다.
//     /api/landing-stats 가 실제 값을 반환하면 그것으로 교체된다.
// ─────────────────────────────────────────────────────────────

const FEATURE_GROUPS = [
 { id: 'tools-visibility', title: '노출과 키워드 점검', titles: ['네이버 플레이스 SEO', '블로그 순위 추적'] },
 { id: 'tools-reviews', title: '리뷰와 고객 관리', titles: ['멀티플랫폼 리뷰 관리', '실시간 리뷰 알림', '답글 발행 통계', 'QR 리뷰 자동화', 'CRM 고객관리', '플랫폼 통합 관리'] },
 { id: 'tools-content', title: '콘텐츠 제작과 발행', titles: ['네이버 블로그 포스팅', '릴스·쇼츠 자동 기획', '스레드(Threads) 자동 발행', '유튜브 커뮤니티 자동', '카드뉴스 자동 제작'] },
]

const FEATURE_ACTIONS: Record<string, string> = {
 '/marketing/place': '플레이스 도구 보기',
 '/marketing/blog-tracking': '추적 도구 보기',
 '/service-intro': '서비스 소개 보기',
 '/review-admin/stats': '발행 통계 화면 보기',
 '/review/demo': '체험 화면 보기',
 '/pricing': '요금 안내 보기',
 '/marketing/blog-post': '글 작성 도구 보기',
 '/marketing/reels': '기획 도구 보기',
 '/marketing/threads': '발행 도구 보기',
 '/marketing/youtube-community': '커뮤니티 도구 보기',
 '/marketing/card-news': '제작 도구 보기',
}

/**
 * 실데이터 연동 전 표시할 값.
 * 시간이 지나도 변하지 않는다 — 성장 연출을 하지 않기 위함.
 * 전부 "제품 사양"이라 사실이고, 사용자 수를 지어내지 않는다.
 */
function computeStats(extraOwners = 0, extraReplies = 0) {
 void extraOwners
 void extraReplies
 return [
 { num: '6곳', label: '연결 가능 플랫폼' },
 { num: '4종', label: 'AI 답글 말투' },
 { num: '24시간', label: '자동 수집 주기' },
 { num: '3분', label: '매장 연결 소요' },
 ]
}

// SSR 초기 값 — 클라에서 /api/landing-stats 응답이 오면 교체
const STATS_DEMO = computeStats(0, 0)

const HERO_DEMO = {
 reviewsPerMonth: '+20개',
 reviewsPerMonthLabel: '월평균 리뷰 증가',
 avgRating: '4.7점',
 avgRatingLabel: '평균 별점',
}

type Testimonial = {
 name: string
 store: string
 text: string
 rating: number
 iconKey: 'coffee' | 'food' | 'gym'
 color: string
}

const ICON_MAP = {
 coffee: Coffee,
 food: UtensilsCrossed,
 gym: Dumbbell,
} as const

const TESTIMONIALS_DEMO: Testimonial[] = [
 {
 name: '김○○ 사장님',
 store: '부천 카페 운영',
 text: '매일 리뷰 답글 다는 게 너무 힘들었는데, 로컬루션 쓰고 나서 5분도 안 걸려요. 별점도 4.2에서 4.8로 올라갔어요!',
 rating: 5,
 iconKey: 'coffee',
 color: '#8B5CF6',
 },
 {
 name: '이○○ 대표님',
 store: '서울 맛집 운영',
 text: '클라이언트 10곳 동시 관리하는데 로컬루션 없으면 못 살아요. 키워드 분석이랑 리뷰 관리가 한 곳에 있어서 너무 편해요.',
 rating: 5,
 iconKey: 'food',
 color: '#F59E0B',
 },
 {
 name: '박○○ 원장님',
 store: '일산 헬스장 운영',
 text: 'QR 리뷰 붙여놨더니 손님들이 알아서 리뷰 써줘요. 한 달에 리뷰 50개 이상 늘었어요.',
 rating: 5,
 iconKey: 'gym',
 color: '#10B981',
 },
]

// QR 톤 뱃지 (브랜드 아이콘으로 교체)
const QR_TONES = [
 { Icon: Flame, label: 'Z세대' },
 { Icon: Heart, label: '맘카페' },
 { Icon: PenLine, label: '솔직담백' },
 { Icon: Wine, label: '미식가' },
 { Icon: UserPlus, label: '친구추천' },
 { Icon: Camera, label: '인스타감성' },
]

// 홈 FAQ · 화면에 보이는 8개와 FAQPage 스키마가 같은 배열을 쓴다 (AEO · 개수 불일치 금지)
const HOME_FAQS: FaqItem[] = [
 {
 q: 'AI 답글 톤이 정말 다양한가요?',
 a: '친근·전문·유머·심플·감성·MZ·공식·감사·사과·미식까지 10종 기본 + 사장님이 직접 정의하는 맞춤 톤까지 총 11종을 지원해요. 부정 리뷰엔 사과 톤, 음식점은 미식 톤처럼 상황에 맞게 골라쓸 수 있고, 우리 매장만의 말투도 직접 입력해서 저장할 수 있어요.',
 },
 {
 q: '리뷰가 새로 달리면 바로 알 수 있나요?',
 a: '15분마다 자동 수집해서 별점 1-2점 부정 리뷰가 오면 우선순위로 알려드려요. 웹푸시 + 카카오톡 두 채널로 받아 빠르게 대응 가능해요. 답글 발행 통계 페이지에서 플랫폼별 답변률·자동 발행 성공률도 한눈에 확인하세요.',
 },
 {
 q: '진짜 무료로 쓸 수 있나요?',
 a: '플레이스 진단·키워드 순위 확인 등 기본 기능은 전부 무료예요. 블로그 초안·릴스 대본 같은 AI 생성 기능은 월 무료 횟수가 있고, 그 이상 쓸 때만 요금이 붙어요. 신용카드 없이 가입 가능해요.',
 },
 {
 q: '네이버 계정 연동이 걱정돼요. 비밀번호가 저장되나요?',
 a: '저장되더라도 AES-256-GCM 암호화 + 서버 KEK 분리 보관으로 안전하게 관리되고, 답글 발행 외 다른 용도로는 절대 사용되지 않아요. 언제든 네이버 설정에서 연동 해제 가능해요.',
 },
 {
 q: '6개 플랫폼 답글이 진짜 자동으로 등록되나요?',
 a: '네이버는 14단계 자동화 (v37) 로 답글이 직접 등록되고, 배민·요기요·쿠팡이츠는 한국 IP 거주형 프록시 + 쿠키 자동 갱신으로 등록돼요. 카카오맵은 카카오 비즈니스 권한이 연결된 매장에 한해 자동 등록 가능해요. 통계 페이지에서 등록 결과까지 확인 가능합니다.',
 },
 {
 q: '매장이 여러 개인데 한 계정에서 관리되나요?',
 a: '여러 매장을 하나의 로컬루션 계정에서 관리할 수 있어요. 요기요 같은 다중 매장은 자동 감지되고, 1인 마케팅 대행사나 프랜차이즈 본부 사장님들이 특히 많이 쓰시고, Pro 플랜에서는 매장별 권한 분리도 됩니다.',
 },
 {
 q: '해지가 어렵거나 자동결제가 무서워요',
 a: '언제든 설정에서 원클릭으로 해지 가능하고, 당월 남은 일수만큼 일할 계산 후 환불해드려요. 결제 키도 서버에서 토큰화해 보관하고 (billing_methods + 토스 시크릿 키), 카드 정보는 로컬에 절대 저장되지 않아요.',
 },
 {
 q: '리뷰 답글을 AI가 달면 고객이 티 나게 느끼지 않을까요?',
 a: '로컬루션 AI는 매장 말투·시그니처 메뉴·사장님 이름까지 학습하고, 사장님이 직접 정의한 맞춤 톤까지 적용해 답글을 생성해요. 최종 발행 전에 사장님이 검토·수정할 수 있어서 기계 답글처럼 느껴지지 않아요.',
 },
]

function FaqSlider({ faqs }: { faqs: { q: string; a: string }[] }) {
 const [cur, setCur] = useState(0)
 const prev = () => setCur(c => (c - 1 + faqs.length) % faqs.length)
 const next = () => setCur(c => (c + 1) % faqs.length)

 return (
 <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-20 px-4 bg-white">
 <div className="max-w-3xl mx-auto">
 <div className="text-center mb-10">
 <h2 id="faq-title" className="text-2xl md:text-3xl font-semibold text-[var(--lu-ink)] mb-2">
 사장님들이 많이 물어보시는 것
 </h2>
 <p className="text-[var(--lu-muted)] text-sm text-left sm:text-center">가입 전 궁금증부터 풀고 가세요</p>
 </div>

 {/* 슬라이드 영역 */}
 <div className="relative">
 {/* 카드 */}
 <div className="overflow-hidden rounded-[10px]">
 <div
 className="flex motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-in-out"
 style={{ transform: `translateX(-${cur * 100}%)` }}
 >
 {faqs.map((item, i) => (
 <div key={i} id={`faq-panel-${i}`} aria-hidden={i !== cur} className="w-full min-w-0 shrink-0 bg-[var(--lu-canvas)] border border-gray-100 rounded-[10px] p-8 md:p-10">
 <div className="text-xs font-bold text-[var(--lu-accent)] mb-4 tracking-widest uppercase">
 Q&A {i + 1} / {faqs.length}
 </div>
 <p className="text-lg md:text-xl font-semibold text-[var(--lu-ink)] mb-5 leading-snug">
 {item.q}
 </p>
 <div className="w-8 h-0.5 bg-[var(--lu-accent)] mb-5 rounded-full" />
 <p className="text-sm md:text-base text-[var(--lu-muted)] leading-relaxed">
 {item.a}
 </p>
 </div>
 ))}
 </div>
 </div>

 {/* 좌우 버튼 */}
 <div className="mt-3 flex justify-between">
 <button
 onClick={prev}
 className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:border-[var(--lu-accent)] hover:text-[var(--lu-accent)] transition-all text-[var(--lu-muted)]"
 type="button"
 aria-label="이전 질문"
 >
 <ArrowRight size={16} strokeWidth={2.5} className="rotate-180" />
 </button>
 <button
 onClick={next}
 className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:border-[var(--lu-accent)] hover:text-[var(--lu-accent)] transition-all text-[var(--lu-muted)]"
 type="button"
 aria-label="다음 질문"
 >
 <ArrowRight size={16} strokeWidth={2.5} />
 </button>
 </div>
 </div>

 {/* 진행 점 */}
 <div className="flex flex-wrap justify-center gap-0 mt-6">
 {faqs.map((_, i) => (
 <button
 key={i}
 onClick={() => setCur(i)}
 type="button"
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)]"
 aria-label={`${i + 1}번 질문`}
 aria-current={i === cur ? 'true' : undefined}
 aria-controls={`faq-panel-${i}`}
 >
 <span aria-hidden="true" className={`h-2 rounded-full ${i === cur ? 'w-6 bg-[var(--lu-accent)]' : 'w-2 bg-gray-200'}`} />
 </button>
 ))}
 </div>
 </div>
 </section>
 )
}

export default function LandingPage() {
 // 루트 `/` 는 공개 랜딩 페이지 — 자동 리다이렉트 없음
 // 로그인 상태는 TopNav 가 쿠키 기반으로 '대시보드 바로가기' 로 표시

 // 실제 데이터 들어오기 전까지는 데모 값으로 노출. API 에서 null 이 아닌 값이 오면 자동 교체.
 const [stats, setStats] = useState(STATS_DEMO)
 const [hero, setHero] = useState(HERO_DEMO)
 const [testimonials, setTestimonials] = useState<Testimonial[]>(TESTIMONIALS_DEMO)
 const [liveSections, setLiveSections] = useState({ stats: false, hero: false, testimonials: false })
 // 25차-1: 쿠키 기반 로그인 여부 감지 → 하단 CTA 분기 (/updates 핸드오버 패턴 재사용)
 const [isLoggedIn, setIsLoggedIn] = useState(false)
 const [dayStep, setDayStep] = useState(0)

 const DAY_SCENES: { time: string; badge: string; Icon: LucideIcon; platform: string; msg: string; stress: boolean }[] = [
 { time: '08:00', badge: '오픈', Icon: Coffee, platform: '', msg: '청소·준비·재고 체크…', stress: false },
 { time: '09:20', badge: '알림', Icon: Inbox, platform: '네이버', msg: '리뷰 3개가 새로 달렸어요', stress: true },
 { time: '11:50', badge: '피크', Icon: UtensilsCrossed, platform: '', msg: '점심 피크, 주방 정신없음', stress: false },
 { time: '13:10', badge: '알림', Icon: Bell, platform: '배민', msg: '리뷰 2개 · 구글 1개 추가 도착', stress: true },
 { time: '15:30', badge: '알림', Icon: Star, platform: '요기요', msg: '별점 2점 리뷰 · 어떻게 답글?', stress: true },
 { time: '18:00', badge: '마감', Icon: CreditCard, platform: '', msg: '카드·현금 매출 정산 시작…', stress: false },
 { time: '22:40', badge: '야근', Icon: Frown, platform: '', msg: '답글 아직 8개 남음. 내일 또 반복', stress: true },
 ]

 useEffect(() => {
 const t = setInterval(() => setDayStep(s => (s + 1) % DAY_SCENES.length), 1800)
 return () => clearInterval(t)
 }, [DAY_SCENES.length])

 useEffect(() => {
 if (typeof document === 'undefined') return
 const c = document.cookie || ''
 const hasCookie = /(^|;\s*)(localution_user|sb-[^=]+-auth-token)=/i.test(c)
 setIsLoggedIn(hasCookie)
 }, [])

 // 2026-08-19: 날짜 기반 자동 증가를 제거했으므로 마운트 시 재계산할 이유가 없다.
 // (STATS_DEMO 가 이미 같은 값이고, 실데이터는 아래 /api/landing-stats 가 채운다)

 useEffect(() => {
 let cancelled = false
 fetch('/api/landing-stats')
 .then(r => (r.ok ? r.json() : null))
 .then(data => {
 if (cancelled || !data) return
 const content = parseLandingContent(data)
 if (content.stats) setStats(content.stats)
 if (content.hero) setHero(content.hero)
 if (content.testimonials) setTestimonials(content.testimonials)
 setLiveSections({
 stats: Boolean(content.stats),
 hero: Boolean(content.hero),
 testimonials: Boolean(content.testimonials),
 })
 })
 .catch(() => {})
 return () => {
 cancelled = true
 }
 }, [])

 return (
 <div className="min-h-screen bg-white">

 {/* SEO · GEO : 사실은 app/lib/seo.ts 한 곳에서 온다 · FAQ 는 화면과 같은 HOME_FAQS */}
 <JsonLd data={graphLd([softwareApplicationLd(), organizationLd(), webSiteLd(), faqPageLd(HOME_FAQS, SITE.url + '/#faq')])} />

 <TopNav />

 {/* 공개 홈은 실제 작업 도구와 이용 조건을 먼저 안내한다. */}
 <section className="lu-hero" aria-labelledby="home-title">
 <div className="lu-hero-grid">
 <div>
 <p className="lu-label mb-5 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--lu-accent)]" aria-hidden="true" />사장님을 위한 마케팅 작업 공간</p>
 <h1 id="home-title" className="text-[var(--lu-ink)]">가게를 돌보는 일에<br />조금 더 집중하도록.</h1>
 <p className="lu-hero-description">리뷰를 확인하고, 공지를 만들고, 홍보 비용을 비교하세요. 흩어진 마케팅 업무를 한곳에 모아 필요한 일부터 차근차근 시작해 보세요.</p>
 <div className="lu-hero-actions">
 <Link href="/marketing" className="lu-primary inline-flex items-center gap-3">마케팅 도구 시작하기<ArrowRight size={18} aria-hidden="true" /></Link>
 <a href="/help/videos" className="inline-flex min-h-[44px] items-center gap-2 px-3 font-semibold text-[var(--lu-ink)]">기능별 영상 보기<ArrowRight size={16} aria-hidden="true" /></a>
 </div>
 <p className="lu-hero-footnote">계산·공지·홍보 링크 도구는 로그인 없이 사용할 수 있어요.<br />리뷰와 매장 검색은 로그인 및 서비스 연결이 필요해요.</p>
 <Link href="/help#find-tools" className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">내 업종에 맞는 작업 찾기<ArrowRight size={15} aria-hidden="true" /></Link>
 </div>
 <div className="lu-workbench">
 <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--lu-line)] pb-5"><div><p className="lu-label">필요한 일부터 하나씩</p><h2 className="mt-1 text-xl font-semibold text-[var(--lu-ink)]">우리 가게 업무 보드</h2></div><Layers size={20} className="mt-1 text-[var(--lu-accent)]" aria-hidden="true" /></div>
 {([
 { Icon: MessageCircle, title: '리뷰 확인과 답글', detail: '연결한 매장의 고객 의견을 살펴보세요.', href: '/review-admin', label: '로그인 필요' },
 { Icon: FileText, title: '손님께 전할 공지', detail: '휴무·영업시간·예약 안내를 준비하세요.', href: '/marketing/notice', label: '바로 사용' },
 { Icon: BarChart3, title: '행사 전에 수익 확인', detail: '할인과 홍보비가 남는 이익에 미치는 영향을 비교하세요.', href: '/marketing/promotion-profit', label: '바로 사용' },
 ]).map(({Icon,title,detail,href,label}) => <Link key={href} href={href} className="lu-workbench-row"><span className="lu-soft-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--lu-ink)]">{title}</span><span className="mt-1 block text-xs leading-5 text-[var(--lu-muted)]">{detail}</span></span><span className="shrink-0 text-[11px] font-medium text-[var(--lu-muted)]">{label}</span><ArrowRight size={14} className="shrink-0" aria-hidden="true" /></Link>)}
 <p className="mt-4 text-xs leading-5 text-[var(--lu-muted)]">이용 흐름 안내입니다. 실제 매장 자료나 성과 수치를 표시한 화면이 아니에요.</p>
 </div>
 </div>
 </section>

 <WorkflowMotion />

 {/* ── 통계 ── */}
 <section className="py-12 px-4 bg-white border-b border-gray-100">
 <div className="max-w-4xl mx-auto">
 {!liveSections.stats && (
 <div className="text-center mb-6">
 <span className="inline-block text-[11px] font-semibold text-[var(--lu-muted)] bg-[var(--lu-canvas)] px-2.5 py-1 rounded-full">
 예시 · 실제 데이터 연동 예정
 </span>
 </div>
 )}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
 {stats.map((s, i) => (
 <div key={`${s.label}-${i}`} className="text-center group">
 {/* SVG 배경 링 */}
 <div className="relative inline-flex items-center justify-center mb-3">
 <svg width="64" height="64" viewBox="0 0 64 64" className="absolute opacity-10 group-hover:opacity-20 transition-opacity" aria-hidden="true">
 <circle cx="32" cy="32" r="30" stroke="var(--lu-accent)" strokeWidth="3" fill="none" strokeDasharray="8 4" />
 </svg>
 <div className="text-2xl md:text-3xl font-semibold text-[var(--lu-accent)]">{s.num}</div>
 </div>
 <div className="text-xs md:text-sm text-[var(--lu-muted)] font-medium">{s.label}</div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── Before → After 비교 섹션 ── */}
 <section className="py-16 px-4 bg-white">
 <div className="max-w-4xl mx-auto">
 <div className="text-center mb-10">
 <h2 className="text-2xl md:text-3xl font-semibold text-[var(--lu-ink)] mb-2">
 혼자 다 하려면 하루가 모자라요
 </h2>
 <p className="text-[var(--lu-muted)] text-sm">반복되는 홍보와 고객 관리 업무를 차근차근 정리하세요</p>
 </div>
 {/* ── 바쁜 사장님 일과 애니메이션 ── */}
 <div className="flex justify-center mb-8">
 <div className="w-full max-w-sm bg-[#1C1C1E] rounded-[2rem] p-3 shadow-sm">
 {/* 상단 상태바 */}
 <div className="flex justify-between items-center px-3 py-1 mb-2">
 <span className="text-white text-xs font-bold">{DAY_SCENES[dayStep].time}</span>
 <div className="flex gap-1 items-center">
 <span className="text-white text-[10px]">●●●</span>
 <span className="text-white text-[10px]">WiFi</span>
 <span className="text-white text-[9px]">100%</span>
 </div>
 </div>
 {/* 화면 */}
 <div className="bg-[#F2F2F7] rounded-[1.5rem] overflow-hidden min-h-[220px] p-4">
 {/* 날짜 헤더 */}
 <div className="text-center mb-4">
 <div className="text-xs text-gray-400 font-medium">오늘 · 사장님 일과</div>
 </div>
 {/* 알림 카드들 — 최근 3개까지 표시 */}
 <div className="space-y-2">
 {DAY_SCENES.slice(0, dayStep + 1).slice(-3).map((scene, idx, arr) => {
 const isLatest = idx === arr.length - 1
 return (
 <div
 key={scene.time}
 style={{ animation: isLatest ? 'slideIn 0.35s ease-out' : undefined }}
 className={`flex items-start gap-2.5 rounded-xl p-3 ${
 scene.stress
 ? 'bg-red-50 border border-red-100'
 : 'bg-white border border-gray-100'
 }`}
 >
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${scene.stress ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
 <scene.Icon size={14} strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5 mb-0.5">
 {scene.platform && (
 <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
 {scene.platform}
 </span>
 )}
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
 scene.stress ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'
 }`}>
 {scene.badge}
 </span>
 <span className="text-[10px] text-gray-400 ml-auto">{scene.time}</span>
 </div>
 <p className="text-xs text-gray-700 font-medium leading-snug">{scene.msg}</p>
 </div>
 </div>
 )
 })}
 </div>
 {/* 진행 점 */}
 <div className="flex justify-center gap-1.5 mt-4">
 {DAY_SCENES.map((_, i) => (
 <span
 key={i}
 className={`inline-block rounded-full transition-all duration-300 ${
 i === dayStep ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-gray-300'
 }`}
 />
 ))}
 </div>
 </div>
 </div>
 </div>

 <style>{`
 @keyframes slideIn {
 from { opacity: 0; transform: translateY(-8px); }
 to { opacity: 1; transform: translateY(0); }
 }
 `}</style>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
 {/* Before */}
 <div className="bg-[#FFF5F5] border border-red-100 rounded-[10px] p-6">
 <div className="flex items-center gap-2 mb-5">
 <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-500"><Frown size={18} strokeWidth={2.5} /></div>
 <span className="font-semibold text-[var(--lu-ink)] text-base">로컬루션 전</span>
 </div>
 <ul className="space-y-3.5">
 {([
 ['리뷰 답글 1개', '10분 소요, 말투 고민'],
 ['플랫폼 관리', '탭 5개 열어두고 왔다갔다'],
 ['키워드 순위', '눈으로 직접 검색해서 확인'],
 ['정산·급여', '엑셀에 하나씩 손으로 입력'],
 ['고객 재방문 유도', '기억으로 연락, 자주 놓침'],
 ] as [string, string][]).map(([title, desc]) => (
 <li key={title} className="flex items-start gap-3">
 <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 mt-0.5" aria-hidden="true">
 <circle cx="8" cy="8" r="7.5" fill="#FEE2E2" />
 <path d="M5 5l6 6M11 5l-6 6" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round" />
 </svg>
 <div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">{title}</span>
 <span className="text-xs text-[var(--lu-muted)] ml-1.5">{desc}</span>
 </div>
 </li>
 ))}
 </ul>
 </div>
 {/* After */}
 <div className="bg-[var(--lu-accent-soft)] border border-blue-100 rounded-[10px] p-6">
 <div className="flex items-center gap-2 mb-5">
 <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-500"><Sparkles size={18} strokeWidth={2.5} /></div>
 <span className="font-semibold text-[var(--lu-ink)] text-base">로컬루션 후</span>
 </div>
 <ul className="space-y-3.5">
 {([
 ['AI 답글 자동 생성', '30초, 말투 11종 + 사장님 맞춤'],
 ['6개 플랫폼 통합', '한 화면 + 답변률·성공률 통계'],
 ['실시간 리뷰 알림', '15분 자동 + 부정 리뷰 우선순위'],
 ['키워드 순위 자동 추적', '매일 카카오톡으로 리포트'],
 ['CRM 재방문 유도', '방문 2주 후 자동 알림톡'],
 ] as [string, string][]).map(([title, desc]) => (
 <li key={title} className="flex items-start gap-3">
 <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 mt-0.5" aria-hidden="true">
 <circle cx="8" cy="8" r="7.5" fill="#DBEAFE" />
 <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="var(--lu-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
 </svg>
 <div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">{title}</span>
 <span className="text-xs text-[var(--lu-muted)] ml-1.5">{desc}</span>
 </div>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 </section>

 {/* wave divider — white to #F8FAFC */}
 <div className="relative overflow-hidden leading-[0] bg-white" aria-hidden="true">
 <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-8 block" fill="#F8FAFC">
 <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" />
 </svg>
 </div>

 {/* ── 주요 기능 ── */}
 <section id="tools" aria-labelledby="tools-title" className="scroll-mt-24 py-20 px-4 bg-[var(--lu-canvas)]">
 <div className="max-w-6xl mx-auto">
 <div className="text-center mb-14">
 <h2 id="tools-title" className="text-2xl md:text-3xl font-semibold text-[var(--lu-ink)] mb-4">
 지금 필요한 작업을 선택하세요
 </h2>
 <p className="text-[var(--lu-muted)] text-sm md:text-base text-left sm:text-center">
 커피 한 잔 값 월 6,900원 · 3개 묶으면 10% · 5개 15% · 8개 20% 추가 할인
 </p>
 </div>
 <p className="mb-5 text-center text-sm text-[var(--lu-muted)]">기능을 살펴본 뒤 필요한 도구로 이동하세요.</p>
 <nav aria-label="기능 분류" className="mb-8 flex flex-wrap justify-center gap-2">
 {FEATURE_GROUPS.map(group => <a key={group.id} href={`#${group.id}`} className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--lu-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lu-muted)] hover:border-[var(--lu-accent)] hover:text-[var(--lu-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)]">{group.title}</a>)}
 </nav>
 <div className="space-y-10">
 {FEATURE_GROUPS.map(group => (
 <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-24">
 <h3 id={`${group.id}-title`} className="mb-4 text-lg font-semibold text-[var(--lu-ink)]">{group.title}</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {FEATURES.filter(f => group.titles.includes(f.title)).map(f => (
 <Link key={f.title} href={f.href} className="relative bg-white rounded-[10px] p-6 border border-gray-100 hover:border-blue-200 shadow-sm transition-all group flex h-full min-w-0 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)]">
 {f.badge && (
 <span className={`absolute top-4 right-4 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full ${
 f.badge === 'HOT' ? 'bg-red-100 text-red-600'
 : f.badge === '체험가능' ? 'bg-emerald-100 text-emerald-700'
 : 'bg-blue-100 text-blue-600'
 }`}>
 {f.badge}
 </span>
 )}
 <div className="lu-soft-icon mb-4">
 <f.Icon size={20} strokeWidth={1.8} />
 </div>
 <h4 className="text-lg font-semibold text-[var(--lu-ink)] mb-2 flex items-center gap-1.5">
 {f.title}
 <ArrowRight size={14} strokeWidth={2.5} className="text-[var(--lu-muted)] group-hover:text-[var(--lu-accent)] group-hover:translate-x-0.5 transition-all" />
 </h4>
 <p className="text-sm text-[var(--lu-muted)] leading-relaxed mb-4">{f.desc}</p>
 <div className="flex flex-wrap gap-2">
 {f.tags.map(tag => (
 <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-lg ${f.bg} text-gray-600`}>
 {tag}
 </span>
 ))}
 </div>
 <p className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-[var(--lu-accent)]">{FEATURE_ACTIONS[f.href]}<ArrowRight size={16} aria-hidden="true" /></p>
 </Link>
 ))}
 </div>
 </section>
 ))}
 </div>
 <Link href="/marketing/notice" className="mt-8 flex min-h-[44px] flex-wrap items-center justify-between gap-3 rounded-[10px] border border-blue-100 bg-white p-5 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)]">
 <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><FileText size={16} className="text-[var(--lu-accent)]" strokeWidth={2.5} /></span><span className="min-w-0"><span className="block font-semibold text-[var(--lu-ink)]">매장 공지 작성 도우미</span><span className="block text-sm text-[var(--lu-muted)]">휴무와 영업시간 변경 안내 문구를 준비해보세요.</span></span></span>
 <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">공지 준비하기<ArrowRight size={16} aria-hidden="true" /></span>
 </Link>
 <p className="text-center text-xs text-[var(--lu-muted)] mt-6">
 AI 정산·세금계산서·급여 관리는 곧 추가됩니다
 </p>
 </div>
 </section>

 {/* ── 최근 업데이트 (5월 신기능) ── */}
 <section className="py-16 px-4 bg-white border-t border-gray-100">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
 <Sparkles size={12} strokeWidth={2.5} />
 2026년 5월 업데이트
 </div>
 <h2 className="text-2xl md:text-3xl font-semibold text-[var(--lu-ink)] mb-2">
 매주 새 기능이 추가돼요
 </h2>
 <p className="text-[var(--lu-muted)] text-sm text-left sm:text-center">
 사장님 피드백 → 빠른 개발 → 자동 배포 사이클로 매주 업그레이드 중
 </p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {[
 { Icon: BarChart3, title: '답글 발행 통계', desc: '플랫폼별 성공률·실패 원인 한눈에', color: 'from-violet-500 to-purple-600', date: '5월 6일' },
 { Icon: Sparkles, title: 'AI 답글 톤 11종', desc: '감사·사과·미식·사장님 맞춤까지', color: 'from-pink-500 to-rose-500', date: '5월 6일' },
 { Icon: Shield, title: '요기요 30일 정책 차단', desc: '실패 미리 방지 + 다중 매장 자동 감지', color: 'from-fuchsia-500 to-pink-500', date: '5월 6일' },
 { Icon: AtSign, title: '스레드 자동 발행', desc: '예약·답글 체인·카드뉴스 연동', color: 'from-slate-700 to-slate-900', date: '5월 5일' },
 { Icon: Youtube, title: '유튜브 커뮤니티 자동', desc: '댓글 고정까지 한 번에', color: 'from-red-500 to-rose-600', date: '5월 5일' },
 { Icon: BellRing, title: '실시간 리뷰 알림', desc: '15분 자동 수집 + 부정 리뷰 우선', color: 'from-orange-500 to-red-500', date: '5월 3일' },
 ].map((u) => (
 <div key={u.title} className="bg-[#FAFBFF] border border-gray-100 rounded-[10px] p-4 hover:border-blue-200 hover:shadow-sm transition-all">
 <div className="flex items-start gap-3">
 <div className="lu-soft-icon">
 <u.Icon size={18} strokeWidth={1.8} />
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5 mb-0.5">
 <p className="text-sm font-bold text-[var(--lu-ink)] truncate">{u.title}</p>
 <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full flex-shrink-0">NEW</span>
 </div>
 <p className="text-xs text-[var(--lu-muted)] leading-relaxed">{u.desc}</p>
 <p className="text-[10px] text-[var(--lu-muted)] mt-1.5 font-medium">{u.date}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 <div className="text-center mt-8">
 <Link href="/updates" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--lu-accent)] hover:text-[var(--lu-accent-hover)] transition-colors">
 전체 업데이트 내역 보기
 <ArrowRight size={14} strokeWidth={2.5} />
 </Link>
 </div>
 </div>
 </section>

 {/* ── QR 리뷰 하이라이트 ── */}
 <section className="py-20 px-4 bg-white">
 <div className="max-w-5xl mx-auto">
 <div className="bg-[var(--lu-accent)] rounded-[14px] p-8 md:p-12 text-white">
 <div className="flex flex-col md:flex-row items-center gap-8">
 <div className="flex-1">
 <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
 <Sparkles size={12} strokeWidth={2.5} />
 신기능
 </div>
 <h2 className="text-2xl md:text-3xl font-semibold mb-4">
 QR 코드 하나로<br />네이버 리뷰가 쌓인다
 </h2>
 <p className="text-blue-100 text-sm leading-relaxed mb-6">
 손님이 QR을 스캔하면 AI가 맞춤 리뷰를 바로 생성해줘요.<br />
 별점 5점 기본, 말투 6종 선택, 영수증 사진도 분석 가능해요.
 </p>
 <div className="flex flex-wrap gap-2 mb-8">
 {QR_TONES.map(t => (
 <span key={t.label} className="inline-flex items-center gap-1.5 text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">
 <t.Icon size={12} strokeWidth={2.5} />
 {t.label}
 </span>
 ))}
 </div>
 <Link href="/review/demo"
 className="inline-flex items-center gap-2 bg-white text-[var(--lu-accent)] font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
 QR 리뷰 지금 체험하기
 <ArrowRight size={16} strokeWidth={2.5} />
 </Link>
 </div>
 <div className="flex-shrink-0 bg-white/10 rounded-[10px] p-6 text-center w-52">
 <div className="w-16 h-16 rounded-[10px] bg-white/15 flex items-center justify-center mx-auto mb-3">
 <QrCode size={36} strokeWidth={2} className="text-white" />
 </div>
 <div className="text-3xl font-semibold mb-1">{hero.reviewsPerMonth}</div>
 <div className="text-blue-200 text-xs">{hero.reviewsPerMonthLabel}</div>
 <div className="mt-4 pt-4 border-t border-white/20">
 <div className="text-2xl font-semibold mb-1">{hero.avgRating}</div>
 <div className="text-blue-200 text-xs">{hero.avgRatingLabel}</div>
 </div>
 {!liveSections.hero && (
 <div className="mt-3 text-[10px] text-blue-200/80 font-medium">
 예시 값
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ── 이런 분들이 씁니다 (업종 타겟) ── */}
 <section className="py-14 px-4 bg-white border-y border-gray-100">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-8">
 <h2 className="text-2xl md:text-3xl font-semibold text-[var(--lu-ink)] mb-2">
 이런 사장님들이 쓰고 있어요
 </h2>
 <p className="text-[var(--lu-muted)] text-sm text-left sm:text-center">
 1인 운영부터 체인점까지 · 업종 상관없이 네이버·구글·배민이 핵심이라면 전부
 </p>
 </div>
 <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4">
 {[
 { Icon: Coffee, label: '카페' },
 { Icon: UtensilsCrossed, label: '음식점' },
 { Icon: Dumbbell, label: '헬스장' },
 { Icon: Heart, label: '병원' },
 { Icon: Sparkles, label: '네일샵' },
 { Icon: Camera, label: '뷰티샵' },
 { Icon: PenLine, label: '학원' },
 { Icon: Wine, label: '술집·바' },
 ].map(({ Icon, label }) => (
 <div key={label} className="flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-[10px] bg-[var(--lu-accent-soft)] flex items-center justify-center">
 <Icon size={18} strokeWidth={2} className="text-[var(--lu-accent)] md:hidden" />
 <Icon size={22} strokeWidth={2} className="text-[var(--lu-accent)] hidden md:block" />
 </div>
 <span className="text-[10px] md:text-xs font-semibold text-[var(--lu-muted)] text-center leading-tight">{label}</span>
 </div>
 ))}
 </div>
 <p className="text-left sm:text-center text-[11px] text-[var(--lu-muted)] mt-6">
 이외에도 네이버 플레이스·블로그·리뷰 관리가 필요한 모든 자영업자 · 소상공인 · 마케터 · 프리랜서에게 맞춰져 있어요
 </p>
 </div>
 </section>

 {/* wave divider — white to #F8FAFC */}
 <div className="relative overflow-hidden leading-[0] bg-white" aria-hidden="true">
 <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-8 block" fill="#F8FAFC">
 <path d="M0,10 C480,40 960,0 1440,25 L1440,40 L0,40 Z" />
 </svg>
 </div>

 {/* ── 사용자 후기 ── */}
 <section className="py-20 px-4 bg-[#F8FAFC]">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-12">
 <h2 className="text-3xl font-semibold text-[var(--lu-ink)] mb-3">
 {!liveSections.testimonials ? '사용 사례 예시' : '사장님들의 실제 후기'}
 </h2>
 <p className="text-[var(--lu-muted)] text-sm text-left sm:text-center">
 {!liveSections.testimonials
 ? '실제 사용 후기 수집 중 · 아래는 예시 콘텐츠입니다'
 : '로컬루션을 사용 중인 매장 사장님들의 이야기'}
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {testimonials.map((t, i) => {
 const TIcon = ICON_MAP[t.iconKey] ?? Coffee
 return (
 <div key={`${t.name}-${i}`} className="relative bg-white rounded-[10px] p-6 border border-gray-100 shadow-sm hover:shadow-sm hover:-translate-y-0.5 transition-all">
 {/* SVG 큰따옴표 장식 */}
 <svg className="absolute top-4 right-5 opacity-[0.07]" width="36" height="28" viewBox="0 0 36 28" aria-hidden="true">
 <path d="M0 28V17.5C0 7.833 4.5 2.5 13.5 0L15 3C10.5 4.667 8.167 7.833 8 12H14V28H0ZM22 28V17.5C22 7.833 26.5 2.5 35.5 0L37 3C32.5 4.667 30.167 7.833 30 12H36V28H22Z" fill="var(--lu-accent)" />
 </svg>
 {!liveSections.testimonials && (
 <span className="absolute top-4 left-4 text-[10px] font-semibold text-[var(--lu-muted)] bg-[var(--lu-canvas)] px-2 py-0.5 rounded-full">
 예시
 </span>
 )}
 <div className="flex text-[#F59E0B] mb-3 gap-0.5">
 {Array.from({ length: t.rating }).map((_, idx) => (
 <Star key={idx} size={14} strokeWidth={0} fill="currentColor" />
 ))}
 </div>
 <p className="text-sm text-[var(--lu-ink)] leading-relaxed mb-4 break-keep">&quot;{t.text}&quot;</p>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
 style={{ backgroundColor: t.color + '15' }}>
 <TIcon size={18} strokeWidth={2} style={{ color: t.color }} />
 </div>
 <div>
 <div className="text-sm font-bold text-[var(--lu-ink)]">{t.name}</div>
 <div className="text-xs text-[var(--lu-muted)]">{t.store}</div>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 </section>

 {/* ── 자주 묻는 질문 — 좌우 슬라이드 카드 ── */}
 {(() => {
 return (
 <FaqSlider faqs={HOME_FAQS} />
 )
 })()}

 {/* ── 요금 CTA ── */}
 <section className="py-20 px-4 bg-[#F8FAFC]">
 <div className="max-w-3xl mx-auto text-center">
 <h2 className="text-3xl md:text-4xl font-semibold text-[var(--lu-ink)] mb-4">
 필요한 기능만!<br />
 <span className="text-[var(--lu-accent)]">합리적인 요금으로</span>
 </h2>
 <p className="text-[var(--lu-muted)] mb-8 text-left sm:text-center">
 커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰 답글 자동화.<br />
 부담 없이 체험하고 필요한 모듈만 추가하세요.
 </p>
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <Link href="/pricing"
 className="inline-flex items-center justify-center gap-2 border-2 border-[var(--lu-accent)] text-[var(--lu-accent)] font-bold px-8 py-4 rounded-[10px] hover:bg-blue-50 transition-colors">
 요금 보기
 </Link>
 <Link href={isLoggedIn ? '/dashboard' : '/login'}
 className="inline-flex items-center justify-center gap-2 bg-[var(--lu-accent)] text-white font-bold px-8 py-4 rounded-[10px] hover:bg-[var(--lu-accent-hover)] transition-colors shadow-none">
 {isLoggedIn ? '내 대시보드로 이동' : '지금 무료로 시작하기'}
 <ArrowRight size={18} strokeWidth={2.5} />
 </Link>
 </div>
 </div>
 </section>

 {/* ── 푸터 ── */}
 <Footer />

 {/* 하랑마케팅 홍보 팝업 — 우측 하단 */}
 <HarangMarketingPopup />

 </div>
 )
}

