import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { KarrotError, karrotErrors, karrotConnection, karrotCredentials, karrotOrigin, karrotRead, saveKarrotConnection } from '@/app/lib/karrot-ads'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
function failure(error: unknown) { const known = error instanceof KarrotError; const code = known ? error.code : 'request_failed'; return response({ ok: false, code, error: karrotErrors[code] }, known ? error.status : 503) }
export async function GET() {
  const auth = await requireUser(); if (!auth.ok) return response({ ok: false, error: auth.message }, auth.status)
  try { const account = await karrotConnection(auth.userId); return response({ ok: true, connected: !!account, advertiser_id: account?.advertiser_id ?? null, updated_at: account?.updated_at ?? null }) } catch (error) { return failure(error) }
}
export async function DELETE(request: Request) {
  const auth = await requireUser(); if (!auth.ok) return response({ ok: false, error: auth.message }, auth.status)
  try {
    karrotOrigin(request)
    const { data, error } = await createServiceClient().from('karrot_ad_connections').delete().eq('user_id', auth.userId).select('user_id').maybeSingle()
    if (error) throw new KarrotError('storage_unavailable', 503)
    return response({ ok: true, connected: false, removed: !!data })
  } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  const auth = await requireUser(); if (!auth.ok) return response({ ok: false, error: auth.message }, auth.status)
  try {
    karrotOrigin(request)
    if (!/^[a-fA-F0-9]{64}$/.test(process.env.ENCRYPTION_KEK_HEX || '')) throw new KarrotError('configuration_required', 503)
    const input = await request.json(); const { advertiserId, apiKey } = karrotCredentials(input.advertiser_id, input.api_key)
    const check = await karrotRead(advertiserId, apiKey, '/v1/campaigns')
    if (!Array.isArray(check.campaigns) || check.campaigns.some((c: { advertiserId?: unknown }) => String(c.advertiserId) !== advertiserId)) throw new KarrotError('provider_rejected', 502)
    await saveKarrotConnection(auth.userId, advertiserId, apiKey)
    return response({ ok: true, connected: true, advertiser_id: advertiserId })
  } catch (error) { return failure(error) }
}
