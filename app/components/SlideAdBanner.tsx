'use client'

// ═══════════════════════════════════════════════════════════
// SlideAdBanner — 공통 롤링 광고 배너 (dashboard + community 공용)
// · 4초 자동 전환 · 도트 인디케이터 · 좌우 화살표 · 터치 스와이프
// · link 가 http 로 시작하면 새 창, 아니면 현재 창 이동
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import {
 Bot,
 Smartphone,
 BarChart3,
 Wallet,
 Rocket,
 Layers,
 Zap,
 TrendingUp,
 ChevronLeft,
 ChevronRight,
 type LucideIcon,
} from 'lucide-react'

export interface BannerSlide {
 title: string
 sub: string
 desc: string
 bg: string
 Icon: LucideIcon
 link: string
}

// 기본 슬라이드 (dashboard·community 공용)
// Product navigation only. Paid placements require a verified advertiser and disclosure.
export const DEFAULT_BANNER_SLIDES: BannerSlide[] = [{
 title: '우리 가게에 맞는 지원정보 확인하기',
 sub: '공식 공고에서 대상과 신청 기간을 확인하세요',
 desc: '기업마당 · 소상공인24 · K-Startup 공식 안내. 대출 금리나 지원 자격을 임의로 판단하지 않아요.',
 bg: '#16685D', Icon: Wallet, link: '/support',
}]

interface SlideAdBannerProps {
 slides?: BannerSlide[]
 intervalMs?: number
 className?: string
 minHeight?: number
}

export default function SlideAdBanner({
 slides = DEFAULT_BANNER_SLIDES,
 intervalMs = 4000,
 className = 'mb-5',
 minHeight = 160,
}: SlideAdBannerProps) {
 const [idx, setIdx] = useState(0)
 const [isAnimating, setIsAnimating] = useState(false)
 const [slideDir, setSlideDir] = useState(1)
 const touchStart = useRef(0)

 useEffect(() => {
 if (slides.length <= 1) return
 const timer = setInterval(() => {
 setSlideDir(1)
 setIsAnimating(true)
 setTimeout(() => {
 setIdx(prev => (prev + 1) % slides.length)
 setIsAnimating(false)
 }, 400)
 }, intervalMs)
 return () => clearInterval(timer)
 }, [intervalMs, slides.length])

 const goTo = (i: number) => {
 if (i === idx) return
 setSlideDir(i > idx ? 1 : -1)
 setIsAnimating(true)
 setTimeout(() => {
 setIdx(i)
 setIsAnimating(false)
 }, 400)
 }

 if (!slides || slides.length === 0) return null

 const s = slides[idx]
 const SlideIcon = s.Icon
 const isExternal = s.link.startsWith('http')

 return (
 <div className={`relative ${className}`}>
 <div
 className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg relative focus:outline-none focus:ring-2 focus:ring-[#3182F6]/40"
 style={{ background: s.bg, minHeight }}
 role="link"
 tabIndex={0}
 aria-label={`${s.title} 배너 · 클릭 시 ${isExternal ? '새 창' : '이동'}`}
 onClick={() => (isExternal ? window.open(s.link, '_blank') : (window.location.href = s.link))}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault()
 isExternal ? window.open(s.link, '_blank') : (window.location.href = s.link)
 }
 }}
 onTouchStart={(e) => {
 touchStart.current = e.touches[0].clientX
 }}
 onTouchEnd={(e) => {
 const diff = e.changedTouches[0].clientX - touchStart.current
 if (Math.abs(diff) > 50) {
 goTo(
 diff > 0
 ? (idx - 1 + slides.length) % slides.length
 : (idx + 1) % slides.length
 )
 }
 }}
 >
 <div
 className="px-8 py-7 flex items-center justify-between"
 style={{
 opacity: isAnimating ? 0 : 1,
 transform: isAnimating ? `translateX(${slideDir * 30}px)` : 'translateX(0)',
 transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
 }}
 >
 <div className="flex-1 min-w-0">
 <p className="text-white/60 text-xs font-semibold mb-1 tracking-wide uppercase">
 {s.sub}
 </p>
 <h2 className="text-2xl font-black text-white mb-2 leading-tight">
 {s.title}
 </h2>
 <p className="text-sm text-white/80">{s.desc}</p>
 </div>
 <div className="ml-6 flex-shrink-0 w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
 <SlideIcon size={42} strokeWidth={1.75} className="text-white" />
 </div>
 </div>

 {/* 도트 인디케이터 */}
 {slides.length > 1 && (
 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
 {slides.map((_, i) => (
 <button
 key={i}
 onClick={(e) => {
 e.stopPropagation()
 goTo(i)
 }}
 className="transition-all duration-300"
 style={{
 width: i === idx ? 24 : 8,
 height: 8,
 borderRadius: 4,
 background: i === idx ? 'white' : 'rgba(255,255,255,0.4)',
 }}
 aria-label={`슬라이드 ${i + 1}로 이동`}
 />
 ))}
 </div>
 )}

 {/* 좌우 화살표 */}
 {slides.length > 1 && (
 <>
 <button
 onClick={(e) => {
 e.stopPropagation()
 goTo((idx - 1 + slides.length) % slides.length)
 }}
 className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
 aria-label="이전 슬라이드"
 >
 <ChevronLeft size={16} strokeWidth={2.5} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation()
 goTo((idx + 1) % slides.length)
 }}
 className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
 aria-label="다음 슬라이드"
 >
 <ChevronRight size={16} strokeWidth={2.5} />
 </button>
 </>
 )}

 {/* 슬라이드 카운터 */}
 {slides.length > 1 && (
 <div className="absolute top-4 right-4 bg-black/30 text-white text-[10px] px-2.5 py-1 rounded-full font-semibold">
 {idx + 1} / {slides.length}
 </div>
 )}
 </div>
 </div>
 )
}
