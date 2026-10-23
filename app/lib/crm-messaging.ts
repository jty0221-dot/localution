// app/lib/crm-messaging.ts
// ============================================================
// 단체 메시지 대상 · 광고 표기 (LU-018 W2-5) · 순수 함수
//
// · 광고성 메시지는 수신 동의한 손님에게만 — 미동의 · 연락처 없음 · 블랙리스트는 자동 제외
// · 정보통신망법 제50조 취지에 맞춰 첫머리 (광고) 표시와 끝에 수신거부 안내를 붙인다
//   (최종 문구 · 야간 전송 정책은 대표 판단 · 법률 자문 아님)
// · 밤 9시 ~ 아침 8시(KST)는 별도 동의가 필요해 화면에서 경고한다
// ============================================================

export type MessageCandidate = {
  id: string
  name: string
  phone: string
  tags: readonly string[]
  consentMarketing?: boolean
}

export type RecipientSplit<T extends MessageCandidate> = {
  eligible: T[]
  excluded: { noConsent: T[]; noPhone: T[]; blacklisted: T[] }
}

export const AD_PREFIX = '(광고)'
export const OPT_OUT_LINE = "수신을 원하지 않으시면 '수신거부' 라고 답장해주세요."

export function splitMessageRecipients<T extends MessageCandidate>(list: readonly T[]): RecipientSplit<T> {
  const out: RecipientSplit<T> = { eligible: [], excluded: { noConsent: [], noPhone: [], blacklisted: [] } }
  for (const c of list) {
    if (c.tags.includes('블랙리스트')) out.excluded.blacklisted.push(c)
    else if (c.consentMarketing !== true) out.excluded.noConsent.push(c)
    else if (String(c.phone || '').replace(/[^0-9]/g, '').length < 10) out.excluded.noPhone.push(c)
    else out.eligible.push(c)
  }
  return out
}

export function excludedCount<T extends MessageCandidate>(split: RecipientSplit<T>): number {
  return split.excluded.noConsent.length + split.excluded.noPhone.length + split.excluded.blacklisted.length
}

// 본문에 (광고) · 보낸 곳 · 수신거부 안내를 붙인다. 이미 있으면 두 번 붙이지 않는다
export function withAdNotice(body: string, senderName?: string | null): string {
  const text = String(body || '').trim()
  if (!text) return ''
  const sender = String(senderName || '').trim()
  const head = text.startsWith(AD_PREFIX) ? text : `${AD_PREFIX}${sender ? ' ' + sender : ''} ${text}`
  return head.includes('수신거부') ? head : `${head}\n\n${OPT_OUT_LINE}`
}

// 광고 전송 제한 시간대 (KST 21:00 ~ 익일 08:00)
export function isNightAdHour(now: Date = new Date()): boolean {
  const kstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours()
  return kstHour >= 21 || kstHour < 8
}
