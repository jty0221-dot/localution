import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const revalidate = 0
// Public aggregate data has no verified source. Never seed counters or testimonials.
export async function GET() { return NextResponse.json({ ok: false, code: 'not_configured', stats: null, hero: null, testimonials: null }, {status: 503, headers: {'Cache-Control': 'no-store, max-age=0'}}) }
