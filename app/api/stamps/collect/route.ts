// app/api/stamps/collect/route.ts
// ============================================================
// 손님 — 스탬프 적립 (인증 불필요, 공개)
// POST { slug, phone, name? } → 스탬프 +1
// - 같은 phone + slug 60분 내 중복 적립 차단
// - 보상 임계치 도달 시 reward_pending = true 반환
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'
import { checkRate } from '@/app/lib/rateLimit'
import { publicStampCard, publicStampCollection } from '@/app/lib/stamp-public'
import { syncStampCustomer } from '@/app/lib/stamp-customer-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
 'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
 return new NextResponse(null, { status: 204, headers: CORS })
}

// LU-018 · 공개 라우트 속도제한 (Redis fixed-window · rate-limit.ts)
//   · 적립(POST): IP 당 10분 20회 · 매장 당 1시간 300회 (적립 위조 · 손님 명부 오염 방지)
//   · 조회(GET + phone): IP 당 10분 30회 (전화번호 대입 조회 방지) · 카드만 조회: IP 당 1분 60회
// Redis(rate-limit.ts)는 REDIS_URL 이 없거나 오류면 허용으로 열리므로 인스턴스 메모리 한도를 바닥으로 같이 건다
async function limitBoth(bucket: string, id: string, limit: number, windowSec: number): Promise<number | null> {
 const r = await rateLimit({ bucket, id, limit, windowSec })
 if (!r.ok) return r.retryAfter || windowSec
 const m = checkRate(`${bucket}:${id}`, limit, windowSec)
 if (!m.ok) return m.resetIn || windowSec
 return null
}

function tooMany(retryAfter: number) {
 return NextResponse.json(
 { ok: false, error: 'rate_limited', message: '잠시 후 다시 시도해주세요.' },
 { status: 429, headers: { ...CORS, 'Retry-After': String(retryAfter || 60) } },
 )
}

function normalizePhone(p: string): string {
 return String(p || '').replace(/[^0-9]/g, '').slice(0, 11)
}

export async function POST(req: NextRequest) {
 let body: any = {}
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: CORS })
 }

 const slug = String(body?.slug || '').trim()
 const phone = normalizePhone(body?.phone)
 const name = body?.name ? String(body.name).slice(0, 40) : null
 const consent = !!body?.consent_marketing

 if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })
 if (phone.length < 10) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400, headers: CORS })

 const ip = getClientIp(req)
 const byIp = await limitBoth('stamp-collect-ip', ip, 20, 600)
 if (byIp !== null) return tooMany(byIp)
 const byStore = await limitBoth('stamp-collect-store', slug.slice(0, 80), 300, 3600)
 if (byStore !== null) return tooMany(byStore)

 const svc = createServiceClient()

 // 1) 활성 스탬프 카드 조회 (직접 + 폴백)
 let { data: card } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('store_slug', slug)
 .eq('active', true)
 .maybeSingle()

 if (!card) {
 // PostgREST 필터 인젝션 방지 — slug, name 각각 분리 쿼리 (or 보간 미사용)
 const { data: bySlug } = await svc
 .from('stores')
 .select('user_id, slug, name')
 .eq('slug', slug)
 .maybeSingle()
 const store = bySlug || (await svc
 .from('stores')
 .select('user_id, slug, name')
 .eq('name', slug)
 .maybeSingle()).data

 if (store) {
 const { data: cardByUser } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('user_id', store.user_id)
 .eq('active', true)
 .maybeSingle()
 if (cardByUser) {
 card = cardByUser
 if (!cardByUser.store_slug) {
 await svc.from('stamp_cards').update({ store_slug: slug }).eq('id', cardByUser.id)
 }
 }
 }
 }

 if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404, headers: CORS })

 // 2) 적립 정보 조회
 const { data: existing } = await svc
 .from('stamp_collections')
 .select('*')
 .eq('stamp_card_id', card.id)
 .eq('customer_phone', phone)
 .maybeSingle()

 // 3) 60분 내 중복 적립 차단
 if (existing) {
 const lastVisit = new Date(existing.last_visit_at).getTime()
 const minutesAgo = (Date.now() - lastVisit) / 60_000
 if (minutesAgo < 60) {
 return NextResponse.json({
 ok: true, deduped: true,
 card: publicStampCard(card),
 collection: publicStampCollection(existing),
 message: '한 시간 이내에 이미 적립하셨어요.',
 }, { headers: CORS })
 }
 }

 // 4) 적립 처리 — 보상 임계치 도달 시 자동 리셋 + reward_pending 반환
 const newCount = (existing?.current_stamps || 0) + 1
 const willCompleteReward = existing && newCount >= card.required_stamps
 const newStamps = willCompleteReward ? 0 : newCount
 const totalCollected = (existing?.total_collected || 0) + 1
 const rewardsClaimed = willCompleteReward ? (existing?.rewards_claimed || 0) + 1 : (existing?.rewards_claimed || 0)

 // 단계별 보상 (milestone) 도달 감지
 const milestones = Array.isArray(card.milestones) ? card.milestones : []
 const hitMilestone = milestones.find((m: any) => m && newCount === m.at)

 let collectionId = existing?.id

 if (existing) {
 const { error } = await svc
 .from('stamp_collections')
 .update({
 current_stamps: newStamps,
 total_collected: totalCollected,
 rewards_claimed: rewardsClaimed,
 last_visit_at: new Date().toISOString(),
 customer_name: name || existing.customer_name,
 consent_marketing: consent || existing.consent_marketing,
 })
 .eq('id', existing.id)
 if (error) return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500, headers: CORS })
 } else {
 const { data, error } = await svc
 .from('stamp_collections')
 .insert({
 stamp_card_id: card.id,
 store_slug: slug,
 customer_phone: phone,
 customer_name: name,
 current_stamps: 1,
 total_collected: 1,
 rewards_claimed: 0,
 last_visit_at: new Date().toISOString(),
 enrolled_at: new Date().toISOString(),
 consent_marketing: consent,
 })
 .select('id')
 .single()
 if (error) return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500, headers: CORS })
 collectionId = data.id
 }

 // 5) 이벤트 로그
 try {
 await svc.from('stamp_events').insert({
 collection_id: collectionId,
 stamp_card_id: card.id,
 event_type: existing ? (willCompleteReward ? 'reward_claimed' : 'stamped') : 'enrolled',
 meta: { phone_masked: phone.slice(0, 3) + '****' + phone.slice(-2) },
 })
 } catch (_) {}

 // 6) /customers CRM 자동 동기화 — 사장님 user_id 매칭 (LU-018 W2-4)
 // · 신규 손님: '신규' 태그로 등록 (예전에는 첫 방문부터 '단골' 이라 신규/단골 숫자가 틀렸다)
 // · 기존 손님: 방문 +1 · 2회부터 '단골' · 실패는 서버 로그 + stamp_events(crm_sync_failed) 에 남긴다
 if (card.user_id && phone) {
 await syncStampCustomer(svc, {
 ownerId: String(card.user_id),
 phone,
 name,
 addVisits: 1,
 memo: '스탬프 카드 자동 등록',
 source: 'qr_stamp',
 stampCardId: card.id ?? null,
 collectionId: collectionId ?? null,
 consentMarketing: consent,
 })
 }

 // 6) 응답
 const { data: updated } = await svc
 .from('stamp_collections')
 .select('*')
 .eq('id', collectionId)
 .single()

 return NextResponse.json({
 ok: true,
 card: publicStampCard(card),
 collection: publicStampCollection(updated),
 reward_pending: willCompleteReward,
 milestone_reached: hitMilestone || null,
 message: willCompleteReward
 ? `최종 보상 ${card.reward_text} 발급됐어요! 사장님께 보여주세요.`
 : hitMilestone
 ? `${hitMilestone.at}회 달성! ${hitMilestone.reward} 받으세요. 사장님께 화면을 보여주세요.`
 : `+1 스탬프 적립 완료! ${updated?.current_stamps}/${card.required_stamps}`,
 }, { headers: CORS })
}

// GET — 카드 정보 + 손님 적립 현황 조회 (전화번호 기반)
//   · LU-018: 응답은 적립 수 같은 최소값만 (전화번호 · 이름 · 동의 여부 · 사장님 user_id 제외)
export async function GET(req: NextRequest) {
 const slug = req.nextUrl.searchParams.get('slug') || ''
 const phone = normalizePhone(req.nextUrl.searchParams.get('phone') || '')

 if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })

 const ip = getClientIp(req)
 const rl = phone.length >= 10
 ? await limitBoth('stamp-lookup-ip', ip, 30, 600)
 : await limitBoth('stamp-card-ip', ip, 60, 60)
 if (rl !== null) return tooMany(rl)

 const svc = createServiceClient()

 // 1) store_slug 직접 매칭
 let { data: card } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('store_slug', slug)
 .eq('active', true)
 .maybeSingle()

 // 2) 매칭 안 되면 — stores 테이블 통해 매장명/slug 매칭 후 user_id 로 카드 찾기
 if (!card) {
 // PostgREST 필터 인젝션 방지 — slug, name 각각 분리 쿼리
 const { data: bySlug2 } = await svc
 .from('stores')
 .select('id, user_id, slug, name')
 .eq('slug', slug)
 .maybeSingle()
 const store = bySlug2 || (await svc
 .from('stores')
 .select('id, user_id, slug, name')
 .eq('name', slug)
 .maybeSingle()).data

 if (store) {
 const { data: cardByUser } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('user_id', store.user_id)
 .eq('active', true)
 .maybeSingle()
 if (cardByUser) {
 card = cardByUser
 // 자동 보정 — store_slug 채워넣기
 if (!cardByUser.store_slug) {
 await svc.from('stamp_cards').update({ store_slug: slug }).eq('id', cardByUser.id)
 }
 }
 }
 }

 if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404, headers: CORS })

 let collection: any = null
 if (phone.length >= 10) {
 const { data } = await svc
 .from('stamp_collections')
 .select('*')
 .eq('stamp_card_id', card.id)
 .eq('customer_phone', phone)
 .maybeSingle()
 collection = data
 }

 return NextResponse.json({ ok: true, card: publicStampCard(card), collection: publicStampCollection(collection) }, { headers: CORS })
}
