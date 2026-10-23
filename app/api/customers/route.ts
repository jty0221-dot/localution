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
//
// LU-018 W2-5 · 광고 수신 동의(consent_marketing) · 방문일 기준 자동 태그(신규 · 단골 · 휴면)
// · 동의 열이 없는 DB(20261023_crm_consent_marketing.sql 실행 전)에서는 열 없이 다시 시도 → 전원 미동의로 보인다
// · GET 때 방문 수 · 마지막 방문으로 태그를 다시 판정하고, 바뀐 행만 DB 에 반영한다 (휴면은 시간이 지나야 생기므로)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { runWithCustomerOwner } from '@/app/lib/customer-owner'
import { isMissingColumnError } from '@/app/lib/crm-db-errors'
import { applyLifecycleTags, sameTags } from '@/app/lib/customer-lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
// 고객 id 는 uuid — 형식이 틀린 id 가 DB 의 22P02 를 내서 소유 키 오류로 오인되지 않게 먼저 거른다
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SELECT_BASE = 'id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at'
const SELECT = SELECT_BASE + ', consent_marketing'
const CONSENT_COLUMN = 'consent_marketing'
const MAX_TAG_REFRESH = 200

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
 consent_marketing?: boolean | null
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
 consentMarketing: r.consent_marketing === true,
 }
}

function consentPatch(value: unknown): Record<string, unknown> | null {
 if (typeof value !== 'boolean') return null
 return value
 ? { consent_marketing: true, consent_marketing_at: new Date().toISOString(), consent_source: 'owner_record' }
 : { consent_marketing: false, consent_marketing_at: null, consent_source: null }
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
 let consentAvailable = true
 const run = await runWithCustomerOwner(auth, async owner => {
 const list = (cols: string) => svc.from('customers').select(cols).eq('user_id', owner).order('updated_at', { ascending: false })
 const first = await list(SELECT)
 if (!isMissingColumnError(first.error, CONSENT_COLUMN)) return first
 consentAvailable = false
 return list(SELECT_BASE)
 })
 if (!run.ok) return ownerFailure(run)
 const { data, error } = run.result
 if (error) return dbFailure(error, '고객 목록을 불러오지 못했어요.')

 // 방문일 기준 자동 태그 — 화면에는 항상 새 판정을, DB 에는 바뀐 행만 반영
 const now = new Date()
 const rows = ((data || []) as unknown as CustomerRow[]).map(r => {
 const tags = applyLifecycleTags(r.tags, { visits: r.visits_count, lastVisitAt: r.last_visit_at }, now)
 return { row: { ...r, tags }, changed: !sameTags(tags, r.tags ?? []) }
 })
 const changed = rows.filter(x => x.changed).slice(0, MAX_TAG_REFRESH)
 if (changed.length > 0) {
 const results = await Promise.all(changed.map(x => svc.from('customers').update({ tags: x.row.tags }).eq('id', x.row.id).eq('user_id', run.ownerId)))
 const failed = results.filter(r => r.error).length
 if (failed > 0) console.error('[customers] 자동 태그 반영 실패', { failed, total: changed.length })
 }

 return NextResponse.json({
 ok: true,
 customers: rows.map(x => rowToCustomer(x.row)),
 total: rows.length,
 consentAvailable,
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

 const consent = consentPatch(body?.consentMarketing)
 const svc = createServiceClient()
 let consentStored = consent !== null
 const run = await runWithCustomerOwner(auth, async owner => {
 const base = { user_id: owner, name, phone, memo, tags, visits_count: 0, total_spend_krw: 0 }
 const insert = (row: Record<string, unknown>, cols: string) => svc.from('customers').insert(row).select(cols).single()
 const first = await insert({ ...base, ...(consent || {}) }, SELECT)
 if (!isMissingColumnError(first.error, CONSENT_COLUMN)) return first
 consentStored = false
 return insert(base, SELECT_BASE)
 })
 if (!run.ok) return ownerFailure(run)
 const { data, error } = run.result
 if (error || !data) return dbFailure(error || {}, '고객을 저장하지 못했어요.')

 return NextResponse.json({ ok: true, customer: rowToCustomer(data as unknown as CustomerRow), consentStored }, { headers: NO_STORE })
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
 const consent = consentPatch(body?.consentMarketing)

 const svc = createServiceClient()
 let consentStored = consent !== null
 const run = await runWithCustomerOwner(auth, async owner => {
 const update = (row: Record<string, unknown>) => svc.from('customers').update(row).eq('id', id).eq('user_id', owner)
 const first = await update({ ...patch, ...(consent || {}) })
 if (!consent || !isMissingColumnError(first.error, CONSENT_COLUMN)) return first
 consentStored = false
 return update(patch)
 })
 if (!run.ok) return ownerFailure(run)
 if (run.result.error) return dbFailure(run.result.error, '고객 정보를 저장하지 못했어요.')
 if (consent && !consentStored) {
 return NextResponse.json({ ok: false, code: 'consent_unavailable', error: '수신 동의는 아직 서버에 저장할 수 없어요. 나머지 정보는 저장했어요.' }, { status: 409, headers: NO_STORE })
 }

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
