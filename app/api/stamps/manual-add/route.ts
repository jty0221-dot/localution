// app/api/stamps/manual-add/route.ts
// ============================================================
// 사장님 — 손님 수동 추가 (스마트폰 없는 손님 / 오프라인)
// POST { phone, name?, initial_stamps? }
// · 사장님 인증 필요
// · customers + stamp_collections 양쪽 동기화
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { syncStampCustomer } from '@/app/lib/stamp-customer-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizePhone(p: string): string {
 return String(p || '').replace(/[^0-9]/g, '').slice(0, 11)
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const phone = normalizePhone(body?.phone)
 const name = body?.name ? String(body.name).slice(0, 40) : null
 const initialStamps = Math.max(0, Math.min(30, parseInt(String(body?.initial_stamps || '1'), 10)))

 if (phone.length < 10) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 })

 const svc = createServiceClient()

 const { data: card } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('user_id', auth.userId)
 .eq('active', true)
 .maybeSingle()

 if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404 })

 // 기존 적립 정보 확인
 const { data: existing } = await svc
 .from('stamp_collections')
 .select('id, current_stamps, total_collected')
 .eq('stamp_card_id', card.id)
 .eq('customer_phone', phone)
 .maybeSingle()

 if (existing) {
 return NextResponse.json({ ok: false, error: 'already_enrolled', message: '이미 등록된 손님입니다' }, { status: 409 })
 }

 // stamp_collections 등록
 const { error } = await svc.from('stamp_collections').insert({
 stamp_card_id: card.id,
 store_slug: card.store_slug,
 customer_phone: phone,
 customer_name: name,
 current_stamps: initialStamps,
 total_collected: initialStamps,
 rewards_claimed: 0,
 last_visit_at: new Date().toISOString(),
 enrolled_at: new Date().toISOString(),
 consent_marketing: false,
 })

 if (error) return NextResponse.json({ ok: false, error: 'insert_failed', message: error.message }, { status: 500 })

 // customers 동기화 (LU-018 W2-4 · 태그는 방문 수 기준 · 실패는 서버 로그 + stamp_events 기록)
 const sync = await syncStampCustomer(svc, {
 ownerId: auth.userId,
 phone,
 name,
 addVisits: initialStamps,
 memo: '스탬프 카드 수동 등록',
 source: 'manual_add',
 stampCardId: card.id ?? null,
 collectionId: null,
 })
 if (!sync.ok) {
 // 적립 등록은 됐으니 성공으로 두고, 고객 목록 반영 실패를 화면이 알 수 있게 함께 내린다
 return NextResponse.json({ ok: true, customer_synced: false, customer_sync_error: '스탬프는 등록됐지만 고객 목록에는 저장하지 못했어요.' })
 }

 return NextResponse.json({ ok: true, customer_synced: true })
}
