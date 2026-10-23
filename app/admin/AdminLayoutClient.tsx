'use client'

import { usePathname } from 'next/navigation'
import AdminShell from '../components/admin/AdminShell'
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
// 관리자 화면 틀 (클라이언트) — LU-018 · SEC-L01
//   · 관리자 검사는 서버 레이아웃(app/admin/layout.tsx)이 requireAdmin() 으로 먼저 끝낸다.
//     여기까지 왔으면 서버가 관리자로 확인한 요청이다.
//   · 예전처럼 화면에서 isAdminEmail 로 다시 보지 않는다 → 관리자 이메일 목록이 번들에 안 실린다.
//   · 데이터는 각 /api/admin/** 이 requireAdmin 으로 한 번 더 막는다.
// ------------------------------------------------------------
export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
 const pathname = usePathname()
 return <AdminShell pathname={pathname} items={NAV}>{children}</AdminShell>
}
