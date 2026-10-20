'use client'

// ============================================================
// 2-D: 매장 미등록 사용자 글로벌 온보딩 배너
// · 모든 사장님 워크스페이스 페이지 상단에 노출
// · /api/stores/me 응답 기반으로 매장 등록 여부 확인
// · 매장 등록 완료 시 자동으로 사라짐 (state 변경 시 다시 fetch)
// · 공개 랜딩 페이지에서는 숨김
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Rocket } from 'lucide-react'

const HIDE_PATHS = ['/', '/pricing', '/about', '/customers', '/login', '/signup',
 '/service-intro', '/privacy', '/terms', '/my/platforms/naver_place/connect']

export default function OnboardingBanner() {
 const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
 const [dismissed, setDismissed] = useState(false)
 const pathname = usePathname()

 useEffect(() => {
 // 공개 랜딩 / 매장 연결 페이지에서는 fetch 자체 skip
 if (pathname && HIDE_PATHS.includes(pathname)) return
 if (typeof window !== 'undefined') {
 // 사용자가 이번 세션에서 닫았으면 노출 안 함
 if (sessionStorage.getItem('localution.onboarding_dismissed') === '1') {
 setDismissed(true)
 return
 }
 }

 let cancelled = false
 fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
 .then(r => r.ok ? r.json() : null)
 .then(j => {
 if (cancelled || !j?.ok) return
 const hasStore = !!(j.store && j.store.name)
 setNeedsOnboarding(!hasStore)
 })
 .catch(() => null)
 return () => { cancelled = true }
 }, [pathname])

 // 공개 페이지면 숨김
 if (pathname && HIDE_PATHS.includes(pathname)) return null
 if (dismissed) return null
 if (needsOnboarding !== true) return null

 return (
 <div data-onboarding-banner role="region" aria-label="매장 등록 안내" className="relative mt-[57px] md:mt-0 md:ml-[220px] px-4 py-3 bg-[var(--lu-accent)] text-white shadow-none">
 <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <div className="w-9 h-9 rounded-[6px] bg-white/20 flex items-center justify-center flex-shrink-0">
 <Rocket size={18} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-bold break-keep">기본 매장 정보를 먼저 등록해주세요</p>
 <p className="text-[11px] opacity-90 truncate hidden sm:block">
 업체 정보를 저장한 뒤 필요한 플랫폼을 별도로 연결할 수 있어요.
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <Link
 href="/settings?tab=store"
 className="inline-flex min-h-11 items-center px-3 py-1.5 rounded-lg bg-white text-[#16685D] text-xs font-bold hover:bg-[#F0F9FF] active:scale-95 transition-all whitespace-nowrap"
 >
 매장 정보 등록 →
 </Link>
 <button
 type="button"
 onClick={() => {
 setDismissed(true)
 try { sessionStorage.setItem('localution.onboarding_dismissed', '1') } catch {}
 }}
 aria-label="닫기"
 className="min-h-11 w-11 h-11 flex items-center justify-center text-white/70 hover:text-white text-lg leading-none"
 >×</button>
 </div>
 </div>
 </div>
 )
}
