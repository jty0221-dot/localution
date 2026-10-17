'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AdminShell from '../components/admin/AdminShell'
import { supabase } from '@/app/lib/supabase'
import { isAdminEmail } from '@/app/lib/admin-emails'
import { BarChart3, CreditCard, Users, Search, ClipboardList, Send, Activity, Zap, ShieldAlert, Link2, Sparkles, Briefcase, type LucideIcon } from 'lucide-react'

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
 { href: '/admin/inquiries', label: '문의 관리', Icon: ClipboardList },
 { href: '/admin/updates', label: '업데이트 관리', Icon: ClipboardList },
 { href: '/admin/dashboard', label: '대시보드', Icon: BarChart3 },
 { href: '/admin/subscriptions', label: '구독 현황', Icon: CreditCard },
 { href: '/admin/users', label: '사용자', Icon: Users },
 { href: '/admin/threads-testers', label: 'Threads 테스터', Icon: Send },
 { href: '/admin/naver-check', label: '네이버 연동 진단', Icon: Search },
 { href: '/admin/review-health', label: '리뷰 수집 점검', Icon: ClipboardList },
 { href: '/admin/coupang-diagnostics', label: '쿠팡이츠 연동 진단', Icon: Activity },
 { href: '/admin/queue-control', label: '큐 비상 제어', Icon: Zap },
 { href: '/admin/platform-issues', label: '플랫폼 이슈 모니터', Icon: ShieldAlert },
 { href: '/admin/fix-store-id', label: '매장 ID 수동 fix', Icon: Link2 },
 { href: '/admin/reply-quality', label: 'AI 답글 품질 모니터', Icon: Sparkles },
 { href: '/admin/reseller', label: 'Reseller 대시보드', Icon: Briefcase },
]

// ------------------------------------------------------------
// 클라이언트 사이드 이메일 추출 — 듀얼 모드
//   · localution_user 쿠키는 httpOnly:true 로 설정되어 있어 document.cookie 로 못 읽음
//   · /api/me 서버 엔드포인트로 검증 (HMAC 서명도 같이 검증)
// ------------------------------------------------------------
async function readLocalutionUserEmail(): Promise<string | null> {
 try {
 const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' })
 if (!res.ok) return null
 const data = await res.json()
 const email = (data?.user?.email || '').toString().toLowerCase().trim()
 return email || null
 } catch {
 return null
 }
}

async function readSupabaseEmail(): Promise<string | null> {
 try {
 const { data } = await supabase.auth.getUser()
 const email = data?.user?.email?.toLowerCase()?.trim() || null
 return email
 } catch {
 return null
 }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
 const router = useRouter()
 const pathname = usePathname()
 const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking')
 const [reason, setReason] = useState<string>('')

 useEffect(() => {
 let mounted = true
 ;(async () => {
 // 1) localution_user 쿠키 (네이버/카카오/구글 OAuth) — /api/me 로 검증
 const luEmail = await readLocalutionUserEmail()
 if (luEmail) {
 if (!mounted) return
 if (isAdminEmail(luEmail)) {
 setStatus('ok')
 } else {
 setReason(`${luEmail} 계정은 관리자 권한이 없습니다.`)
 setStatus('denied')
 setTimeout(() => router.replace('/'), 1200)
 }
 return
 }

 // 2) Supabase 세션
 const sbEmail = await readSupabaseEmail()
 if (!mounted) return
 if (sbEmail && isAdminEmail(sbEmail)) {
 setStatus('ok')
 } else if (sbEmail) {
 setReason(`${sbEmail} 계정은 관리자 권한이 없습니다.`)
 setStatus('denied')
 setTimeout(() => router.replace('/'), 1200)
 } else {
 setReason('로그인이 필요합니다.')
 setStatus('denied')
 setTimeout(() => router.replace('/login?redirect=/admin/dashboard'), 800)
 }
 })()
 return () => { mounted = false }
 }, [router])

 if (status === 'checking') {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[var(--lu-canvas)]">
 <div className="text-sm text-[var(--lu-muted)]">관리자 인증 확인 중…</div>
 </div>
 )
 }
 if (status === 'denied') {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[var(--lu-canvas)] px-6">
 <div className="text-center">
 <div className="text-base text-[#E11D48] font-bold mb-1">접근 권한이 없습니다.</div>
 <div className="text-sm text-[var(--lu-muted)]">{reason}</div>
 </div>
 </div>
 )
 }

 return <AdminShell pathname={pathname} items={NAV}>{children}</AdminShell>
}
