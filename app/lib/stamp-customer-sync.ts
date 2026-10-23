// app/lib/stamp-customer-sync.ts
// ============================================================
// 스탬프 적립 → /customers 고객 자동 등록 · 방문 반영 (LU-018 W2-4)
//
// · api/stamps/collect (손님 QR 적립) · api/stamps/manual-add (사장님 수동 등록) 가 같이 쓴다
// · 태그는 방문 수 기준 자동 판정(app/lib/customer-lifecycle.ts) — 첫 방문은 '신규', 2회부터 '단골'
// · 실패를 삼키지 않는다 : 서버 로그(console.error) + stamp_events 에 event_type='crm_sync_failed' 기록
//   → 관리자 /api/admin/platform-issues-overview 가 24시간 건수를 보여준다
//   (재방문 분석은 enrolled · stamped · reward_claimed 만 읽어 이 기록이 방문으로 섞이지 않는다)
// · 적립 자체는 실패시키지 않는다 — 손님 화면은 적립 성공, 고객 목록 반영 실패만 기록
// · 손님이 적립 화면에서 광고 수신에 동의하면 customers.consent_marketing 도 켠다 (W2-5)
//   동의 열이 없는 DB(20261023_crm_consent_marketing.sql 실행 전)면 동의 없이 다시 저장한다
//   한 번 받은 동의를 다음 적립의 미체크로 끄지 않는다 (stamp_collections 와 같은 규칙)
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyLifecycleTags } from './customer-lifecycle'
import { classifyCrmSyncError, isMissingColumnError, type DbErrorLike } from './crm-db-errors'

export type StampCustomerSyncInput = {
  ownerId: string // stamp_cards.user_id (text 사장님 ID)
  phone: string // 숫자만
  name: string | null
  addVisits: number
  memo: string
  source: 'qr_stamp' | 'manual_add'
  stampCardId: string | null
  collectionId: string | null
  consentMarketing?: boolean // 이번 적립에서 손님이 동의 체크
}

export type StampCustomerSyncResult =
  | { ok: true; action: 'inserted' | 'updated' }
  | { ok: false; reason: ReturnType<typeof classifyCrmSyncError> | 'missing_owner' }

type CustomerLookup = { id: string; visits_count: number | null; tags: string[] | null }

async function recordFailure(svc: SupabaseClient, input: StampCustomerSyncInput, stage: string, err: DbErrorLike, reason: string) {
  // 전화번호 · 이름 · DB 메시지 원문은 남기지 않는다 (개인정보)
  console.error('[crm-sync] 스탬프 → 고객 자동 등록 실패', {
    reason, stage, code: err?.code ?? null, source: input.source,
    stampCardId: input.stampCardId, collectionId: input.collectionId,
  })
  try {
    const { error } = await svc.from('stamp_events').insert({
      collection_id: input.collectionId,
      stamp_card_id: input.stampCardId,
      event_type: 'crm_sync_failed',
      meta: { reason, stage, code: err?.code ?? null, source: input.source },
    })
    if (error) console.error('[crm-sync] 실패 기록도 저장하지 못함', { code: error.code ?? null })
  } catch (e) {
    console.error('[crm-sync] 실패 기록 예외', e instanceof Error ? e.name : 'unknown')
  }
}

export async function syncStampCustomer(svc: SupabaseClient, input: StampCustomerSyncInput, now: Date = new Date()): Promise<StampCustomerSyncResult> {
  if (!input.ownerId || !input.phone) {
    await recordFailure(svc, input, 'input', null, 'missing_owner')
    return { ok: false, reason: 'missing_owner' }
  }
  const nowIso = now.toISOString()
  const addVisits = Math.max(0, Math.floor(input.addVisits))
  const consent: Record<string, unknown> = input.consentMarketing === true
    ? { consent_marketing: true, consent_marketing_at: nowIso, consent_source: 'stamp' }
    : {}
  const hasConsent = Object.keys(consent).length > 0

  const fail = async (stage: string, err: DbErrorLike): Promise<StampCustomerSyncResult> => {
    const reason = classifyCrmSyncError(err)
    await recordFailure(svc, input, stage, err, reason)
    return { ok: false, reason }
  }

  const update = async (row: CustomerLookup): Promise<StampCustomerSyncResult> => {
    const visits = (row.visits_count || 0) + addVisits
    const patch: Record<string, unknown> = {
      visits_count: visits,
      last_visit_at: nowIso,
      tags: applyLifecycleTags(row.tags, { visits, lastVisitAt: nowIso }, now),
    }
    if (input.name) patch.name = input.name
    let { error } = await svc.from('customers').update({ ...patch, ...consent }).eq('id', row.id)
    if (error && hasConsent && isMissingColumnError(error, 'consent_marketing')) {
      ({ error } = await svc.from('customers').update(patch).eq('id', row.id))
    }
    if (error) return fail('update', error)
    return { ok: true, action: 'updated' }
  }

  const lookup = () => svc
    .from('customers')
    .select('id, visits_count, tags')
    .eq('user_id', input.ownerId)
    .eq('phone', input.phone)
    .maybeSingle()

  const { data: existing, error: lookupError } = await lookup()
  if (lookupError) return fail('lookup', lookupError)
  if (existing) return update(existing as CustomerLookup)

  const newRow = {
    user_id: input.ownerId,
    name: input.name || ('손님 ' + input.phone.slice(-4)),
    phone: input.phone,
    memo: input.memo,
    tags: applyLifecycleTags([], { visits: addVisits, lastVisitAt: nowIso }, now),
    visits_count: addVisits,
    last_visit_at: nowIso,
  }
  let { error: insertError } = await svc.from('customers').insert({ ...newRow, ...consent })
  if (insertError && hasConsent && isMissingColumnError(insertError, 'consent_marketing')) {
    ({ error: insertError } = await svc.from('customers').insert(newRow))
  }
  if (!insertError) return { ok: true, action: 'inserted' }

  // 같은 순간 두 번 적립(동시 요청)으로 unique(user_id, phone) 충돌 → 다시 찾아 방문만 올린다
  if (insertError.code === '23505') {
    const again = await lookup()
    if (!again.error && again.data) return update(again.data as CustomerLookup)
  }
  return fail('insert', insertError)
}
