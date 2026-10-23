// app/api/admin/queue-cleanup/route.ts
// ============================================================
// 관리자 전용 (LU-018 · SEC-L02)
//   · 사장님 화면이 쓰던 자기 데이터 처리기는 /api/me/queue-cleanup 로 옮겼다.
//   · 여기는 requireAdmin 을 통과한 관리자만, 같은 처리기를 관리자 본인 범위로 부른다.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { POST as mePOST } from '@/app/api/me/queue-cleanup/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function gate() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })
  return null
}

export async function POST(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  return mePOST(req)
}

// 관리자는 예전처럼 브라우저 주소로도 부를 수 있다 (관리자 확인 뒤에만 동작)
export async function GET(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  return mePOST(req)
}
