// app/api/customers/route.ts
// ============================================================
// 사장님 — 고객 CRUD (cookie 인증 기반)
// · 스탬프카드/QR 등에서 자동 등록된 고객 + 사장님 직접 등록
// · GET /api/customers → list
// · POST /api/customers → add
// · PUT /api/customers → update (id 필수)
// · DELETE /api/customers?id=xxx → remove
//
// LU-018 W2-4 · 고객 주인 키 = 로그인 ID(text) — stamp_cards 와 같은 키
// · customers.user_id 가 아직 uuid 인 DB 에서는 runWithCustomerOwner 가 예전 env 연결 경로로 한 번 더 시도한다
//   (supabase/migrations/20261023_crm_owner_key_text.sql 실행 뒤에는 그 경로를 타지 않는다)
// · 저장 실패는 code 를 붙여 내려 화면이 '저장 못 함' 을 띄울 수 있게 한다
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { runWithCustomerOwner } from '@/app/lib/customer-owner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
// 고객 id 는 uuid — 형식이 틀린 id 가 DB 의 22P02 를 내서 소유 키 오류로 오인되지 않게 먼저 거른다
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SELECT = 'id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at'

type CustomerRow = {
 id: string
 legacy_id: string | null
 name: string
 phone: string | null
 memo: string
 tags: string[] | null
 visits_count: number
 total_spend_krw: number
 last_visit_at: string | null
}

function rowToCustomer(r: CustomerRow) {
 return {
 id: r.id,
 name: r.name,
 phone: r.phone ?? '',
 visits: r.visits_count ?? 0,
 totalSpend: r.total_spend_krw ?? 0,
 lastVisit: r.last_visit_at ? r.last_visit_at.slice(0, 10) : '',
 tags: (r.tags ?? []) as string[],
 memo: r.memo ?? '',
 }
}

function ownerFailure(f: { status: number; code: string; error: string }) {
 return NextResponse.json({ ok: false, code: f.code, error: f.error }, { status: f.status, headers: NO_STORE })
}

function dbFailure(error: { code?: string | null }, fallback: string) {
 if (error.code === '23505') {
 return NextResponse.json({ ok: false, code: 'duplicate_phone', error: '같은 전화번호의 고객이 이미 있어요.' }, { status: 409, headers: NO_STORE })
 }
 console.error('[customers] DB 오류', { code: error.code ?? null })
 return NextResponse.json({ ok: false, code: 'db_error', error: fallback }, { status: 500, headers: NO_STORE })
}

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const run = await runWithCustomerOwner(auth, owner => svc
 .from('customers')
 .select(SELECT)
 .eq('user_id', owner)
 .order('updated_at', { ascending: false }))
 if (!run.ok) return ownerFailure(run)
 const { data, error } = run.result
 if (error) return dbFailure(error, '고객 목록을 불러오지 못했어요.')

 const rows = (data || []) as CustomerRow[]
 return NextResponse.json({
 ok: true,
 customers: rows.map(rowToCustomer),
 total: rows.length,
 }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const name = String(body?.name || '').trim().slice(0, 60)
 const phone = String(body?.phone || '').replace(/[^0-9]/g, '').slice(0, 11) || null
 const memo = String(body?.memo || '').slice(0, 500)
 const tags = Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === 'string').slice(0, 10) : []

 if (!name) return NextResponse.json({ ok: false, code: 'missing_name', error: '이름을 입력해주세요.' }, { status: 400 })

 const svc = createServiceClient()
 const run = await runWithCustomerOwner(auth, owner => svc
 .from('customers')
 .insert({
 user_id: owner,
 name,
 phone,
 memo,
 tags,
 visits_count: 0,
 total_spend_krw: 0,
 })
 .select(SELECT)
 .single())
 if (!run.ok) return ownerFailure(run)
 const { data, error } = run.result
 if (error || !data) return dbFailure(error || {}, '고객을 저장하지 못했어요.')

 return NextResponse.json({ ok: true, customer: rowToCustomer(data as CustomerRow) }, { headers: NO_STORE })
}

export async function PUT(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const id = String(body?.id || '')
 if (!UUID.test(id)) return NextResponse.json({ ok: false, code: 'missing_id', error: '고객을 찾지 못했어요.' }, { status: 400 })

 const patch: Record<string, any> = {}
 if (body?.name !== undefined) patch.name = String(body.name).slice(0, 60)
 if (body?.phone !== undefined) patch.phone = String(body.phone).replace(/[^0-9]/g, '').slice(0, 11) || null
 if (body?.memo !== undefined) patch.memo = String(body.memo).slice(0, 500)
 if (Array.isArray(body?.tags)) patch.tags = body.tags.filter((t: any) => typeof t === 'string').slice(0, 10)
 if (typeof body?.visits === 'number') patch.visits_count = body.visits
 if (typeof body?.totalSpend === 'number') patch.total_spend_krw = body.totalSpend
 patch.updated_at = new Date().toISOString()

 const svc = createServiceClient()
 const run = await runWithCustomerOwner(auth, owner => svc
 .from('customers')
 .update(patch)
 .eq('id', id)
 .eq('user_id', owner))
 if (!run.ok) return ownerFailure(run)
 if (run.result.error) return dbFailure(run.result.error, '고객 정보를 저장하지 못했어요.')

 return NextResponse.json({ ok: true }, { headers: NO_STORE })
}

export async function DELETE(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const id = req.nextUrl.searchParams.get('id') || ''
 if (!UUID.test(id)) return NextResponse.json({ ok: false, code: 'missing_id', error: '고객을 찾지 못했어요.' }, { status: 400 })

 const svc = createServiceClient()
 const run = await runWithCustomerOwner(auth, owner => svc
 .from('customers')
 .delete()
 .eq('id', id)
 .eq('user_id', owner))
 if (!run.ok) return ownerFailure(run)
 if (run.result.error) return dbFailure(run.result.error, '고객을 삭제하지 못했어요.')

 return NextResponse.json({ ok: true }, { headers: NO_STORE })
}
