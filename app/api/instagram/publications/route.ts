import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { InstagramError, instagramErrorText, sameOrigin, instagramConfig } from '@/app/lib/instagram-api'
import { prepareInstagram, publishInstagram, verifyInstagram } from '@/app/lib/instagram-publication'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
function failure(error: unknown) {
  const code = error instanceof InstagramError ? error.code : 'provider_rejected'
  return NextResponse.json({ ok: false, code, error: instagramErrorText[code] || '연결 상태를 확인해주세요.' }, { status: error instanceof InstagramError ? error.status : 502, headers })
}
export async function GET(request: Request) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, code: 'login_required' }, { status: 401, headers })
  try { instagramConfig(); return NextResponse.json({ ok: true, publication: await verifyInstagram(auth.userId, new URL(request.url).searchParams.get('id') || '') }, { headers }) } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, code: 'login_required' }, { status: 401, headers })
  try {
    sameOrigin(request); instagramConfig()
    let body: Record<string, unknown>
    try { body = await request.json() } catch { throw new InstagramError('invalid_request') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InstagramError('invalid_request')
    const publication = body.action === 'prepare' ? await prepareInstagram(auth.userId, body) : body.action === 'publish' ? await publishInstagram(auth.userId, body) : null
    if (!publication) throw new InstagramError('invalid_request')
    return NextResponse.json({ ok: true, publication }, { headers })
  } catch (error) { return failure(error) }
}
