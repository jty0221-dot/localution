// app/admin/layout.tsx
// ============================================================
// /admin 서버 레이아웃 — 관리자 검사를 서버에서 끝낸다 (LU-018 · SEC-L01)
//   · requireAdmin(): 서명 검증한 localution_user 의 이메일 또는 Supabase 토큰을 서버가 검증한 이메일이
//     관리자 화이트리스트(admin-emails.ts · 서버에서만 읽음)에 있을 때만 통과.
//   · 로그인 안 됨(401) → /login?redirect=/admin/dashboard · 권한 없음(403 등) → /
//   · 화면 틀(AdminShell · 메뉴)은 AdminLayoutClient 가 그린다. 이메일 목록은 클라이언트로 안 간다.
// ============================================================
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/app/lib/adminAuth'
import AdminLayoutClient from './AdminLayoutClient'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    redirect(auth.status === 401 ? '/login?redirect=/admin/dashboard' : '/')
  }
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
