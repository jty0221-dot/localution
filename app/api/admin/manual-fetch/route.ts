// app/api/admin/manual-fetch/route.ts
// ============================================================
// 관리자 전용 (LU-018 · SEC-L02)
//   · 사장님 화면이 쓰던 자기 데이터 처리기는 /api/me/manual-fetch 로 옮겼다.
//   · 여기는 requireAdmin 을 통과한 관리자만, 같은 처리기를 관리자 본인 범위로 부른다.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { GET as meGET } from '@/app/api/me/manual-fetch/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function gate() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })
  return null
}

export async function GET(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  return meGET(req)
}
