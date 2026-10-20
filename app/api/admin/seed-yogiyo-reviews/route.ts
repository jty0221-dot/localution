import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Production must never manufacture customer reviews from a diagnostic GET.
export async function GET() {
  return NextResponse.json({ ok: false, error: 'demo_seed_disabled' }, {
    status: 410,
    headers: { 'Cache-Control': 'no-store' },
  })
}
