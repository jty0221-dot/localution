import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { KarrotError, karrotErrors, karrotReport } from '@/app/lib/karrot-ads'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const auth = await requireUser()
  const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
  if (!auth.ok) return respond({ ok: false, error: auth.message }, auth.status)
  try { const params = new URL(request.url).searchParams; return respond({ ok: true, ...await karrotReport(auth.userId, params.get('start'), params.get('end')) }) }
  catch (error) { const known = error instanceof KarrotError; const code = known ? error.code : 'request_failed'; return respond({ ok: false, code, error: karrotErrors[code] }, known ? error.status : 503) }
}
