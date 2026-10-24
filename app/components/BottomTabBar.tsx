'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, MessageSquare, Megaphone, Users, Settings, LucideIcon } from 'lucide-react'

// 하단 탭바가 보이지 않아야 하는 경로 (로그인 전/랜딩)
const HIDE_PREFIXES = [
 '/login',
 '/signup',
 '/signin',
 '/onboarding',
 '/review', // 손님 QR 리뷰 화면 (/review/[storeId]) — 사장님 폰으로 열어도 하단 탭이 버튼을 가리지 않게
]
const HIDE_EXACT = ['/', '/pricing', '/about', '/terms', '/privacy']

type TabKey = 'home' | 'review' | 'marketing' | 'customers' | 'settings'

const TABS: { key: TabKey; href: string; label: string; Icon: LucideIcon; prefix: string[] }[] = [
 { key: 'home', href: '/dashboard', label: '홈', Icon: Home, prefix: ['/dashboard'] },
 { key: 'review', href: '/review-admin', label: '리뷰', Icon: MessageSquare, prefix: ['/review-admin', '/reviews', '/review'] },
 { key: 'marketing', href: '/marketing', label: '마케팅', Icon: Megaphone, prefix: ['/marketing'] },
 { key: 'customers', href: '/customers', label: '고객', Icon: Users, prefix: ['/customers', '/crm'] },
 { key: 'settings', href: '/settings', label: '설정', Icon: Settings, prefix: ['/settings', '/my', '/inquiry', '/qr-admin'] },
]

// 미답변 리뷰 수: 수집된 값이 없는 상태와 실제 0건을 구분한다.
function readUnansweredCount(): number | null {
 if (typeof window === 'undefined') return null
 try {
 const raw = localStorage.getItem('localution.unanswered_count')
 if (raw !== null) {
 const n = Number(raw)
 if (raw.trim() !== '' && Number.isSafeInteger(n) && n >= 0) return n
 }
 // 수집 결과가 없으면 숫자를 만들어 표시하지 않는다.
 return null
 } catch { return null }
}

export default function BottomTabBar() {
 const pathname = usePathname() || '/'
 const [loggedIn, setLoggedIn] = useState(false)
 const [unanswered, setUnanswered] = useState<number | null>(null)

 useEffect(() => {
 try {
 // localution_session은 httpOnly라 JS에서 못 읽음.
 // 동반 쿠키 localution_user (httpOnly:false)로 로그인 여부 판단.
 const cookieOk = document.cookie.includes('localution_user=')
 const lsOk = typeof localStorage !== 'undefined' && !!localStorage.getItem('localution_user')
 setLoggedIn(cookieOk || lsOk)
 } catch { setLoggedIn(false) }
 }, [pathname])

 useEffect(() => {
 setUnanswered(readUnansweredCount())
 // storage 이벤트로 다른 탭 변경도 반영
 const onStorage = (e: StorageEvent) => {
 if (e.key === 'localution.unanswered_count' || e.key === 'localution.platform_links') {
 setUnanswered(readUnansweredCount())
 }
 }
 // 같은 탭 내부에서의 변경도 감지 (커스텀 이벤트)
 const onCustom = () => setUnanswered(readUnansweredCount())
 window.addEventListener('storage', onStorage)
 window.addEventListener('localution:unanswered-change', onCustom)
 return () => {
 window.removeEventListener('storage', onStorage)
 window.removeEventListener('localution:unanswered-change', onCustom)
 }
 }, [pathname])

 // 숨겨야 할 페이지
 const hide =
 HIDE_EXACT.includes(pathname) ||
 HIDE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))

 // 모바일에서만 보이므로 body에 패딩 클래스 토글
 useEffect(() => {
 if (typeof document === 'undefined') return
 if (!hide && loggedIn) {
 document.body.classList.add('has-bottom-tab')
 } else {
 document.body.classList.remove('has-bottom-tab')
 }
 }, [hide, loggedIn])

 if (hide || !loggedIn) return null

 return (
 <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-white border-t border-[#D5DEDC]">
 <div className="grid grid-cols-5 max-w-screen-sm mx-auto">
 {TABS.map(tab => {
 const active = tab.prefix.some(p => pathname === p || pathname.startsWith(p + '/'))
 const showBadge = tab.key === 'review' && unanswered !== null && unanswered > 0
 return (
 <Link key={tab.href} href={tab.href}
 className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] ${active ? 'text-[#16685D]' : 'text-[#53656A]'} hover:text-[#16685D] transition-colors`}>
 <span className="relative inline-flex items-center justify-center">
 <tab.Icon size={22} strokeWidth={active ? 2.25 : 2} />
 {showBadge && (
 <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F04452] text-white text-[9px] font-semibold flex items-center justify-center leading-none shadow-none border border-white"
 aria-label={`미답변 ${unanswered}건`}>
 {unanswered !== null && unanswered > 99 ? '99+' : unanswered}
 </span>
 )}
 </span>
 <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
 {active && <span className="absolute top-0 w-8 h-0.5 rounded-b bg-[#16685D]"/>}
 </Link>
 )
 })}
 </div>
 </nav>
 )
}
