// app/api/me/usage/route.ts
// ============================================================
// LU-018 W2-12 · /my 서비스 이용 현황 — 서버 집계 (읽기 전용 · 본인 범위)
//   GET → { ok, usage: { stores, customers, platforms } }  · 못 읽은 칸은 null
//   · stores    : stores 행 수 (user_id)
//   · customers : customers 행 수 (/api/customers 와 같은 검증 계정 id)
//   · platforms : platform_credentials 행 수 = 계정을 연결한 매체 수
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { resolveVerifiedIdentity } from '@/app/lib/verified-identity'
import { countOrNull, type MyUsage } from '@/app/lib/my-usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const svc = createServiceClient()

  const safeCount = async (run: () => PromiseLike<{ count: number | null; error: unknown }>) => {
    try { return countOrNull(await run()) } catch { return null }
  }

  const [stores, platforms, customers] = await Promise.all([
    safeCount(() => svc.from('stores').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId)),
    safeCount(() => svc.from('platform_credentials').select('platform', { count: 'exact', head: true }).eq('user_id', auth.userId)),
    (async () => {
      try {
        const identity = await resolveVerifiedIdentity(auth)
        if (!identity.ok) return null
        return countOrNull(await svc.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', identity.userId))
      } catch { return null }
    })(),
  ])

  const usage: MyUsage = { stores, customers, platforms }
  return NextResponse.json({ ok: true, usage }, { headers: { 'Cache-Control': 'private, no-store' } })
}
