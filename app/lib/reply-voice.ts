// app/lib/reply-voice.ts
// ============================================================
// LU-018 W2-10 · 답글 말투 설정 — 계정 하나의 서버 저장 (순수 로직)
//
// 예전에는 세 군데로 갈라져 있었다:
//   1) /settings AI 탭 — 저장 기능 없음 (새로고침하면 사라짐)
//   2) 리뷰 편집기(PlatformReviewAdmin) — 브라우저 localStorage
//   3) 자동답글 — platform_credentials.extra_data.autoreply_tone (매체별)
// 이제 계정당 한 벌(reply_voice_settings.settings)을 두고 셋이 같은 값을 읽는다.
// 자동답글 크론은 extra_data.autoreply_tone 을 읽으므로 저장 때 그 값도 맞춘다.
// ============================================================

/** 말투 — 편집기 · ai-review-reply 가 이해하는 어휘로 통일 */
export const REPLY_TONES = [
  'auto', 'friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal',
  'grateful', 'apologetic', 'gourmand', 'custom',
] as const
export type ReplyTone = typeof REPLY_TONES[number]

/** 자동답글 크론이 받는 말투 (api/autoreply/settings VALID_TONES 와 같음) */
export const AUTOREPLY_TONES = ['friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal'] as const

export const REPLY_LENGTHS = ['short', 'medium', 'long'] as const
export const SPEAKER_GENDERS = ['none', 'male', 'female', 'neutral'] as const
export const SPEAKER_AGES = ['none', '20s', '30s', '40s', '50s'] as const
export const CUSTOMER_GENDERS = ['none', 'male', 'female'] as const
export const CUSTOMER_AGES = ['', 'teen', '20s', '30s', '40s', '50s', '60s'] as const

export const INCLUDE_KEYS = ['thanks', 'revisit', 'mention', 'personalize', 'improve', 'keyword'] as const
export type IncludeKey = typeof INCLUDE_KEYS[number]

export interface ReplyVoice {
  tone: ReplyTone
  length: typeof REPLY_LENGTHS[number]
  /** 화자(사장님) 말투 느낌 — /settings AI 탭 */
  speaker_gender: typeof SPEAKER_GENDERS[number]
  speaker_age: typeof SPEAKER_AGES[number]
  /** 편집기 기본 고객 프로필 — 리뷰 쓴 손님 기준 */
  customer_gender: typeof CUSTOMER_GENDERS[number]
  customer_age: typeof CUSTOMER_AGES[number]
  /** tone=custom 일 때 사장님 맞춤 지시 */
  custom_prompt: string
  closing: string
  excludes: string
  includes: Record<IncludeKey, boolean>
  biz_type: string
  store_desc: string
}

export const DEFAULT_REPLY_VOICE: ReplyVoice = {
  tone: 'friendly',
  length: 'medium',
  speaker_gender: 'none',
  speaker_age: 'none',
  customer_gender: 'none',
  customer_age: '',
  custom_prompt: '',
  closing: '',
  excludes: '',
  includes: { thanks: true, revisit: true, mention: true, personalize: false, improve: true, keyword: false },
  biz_type: '',
  store_desc: '',
}

const LIMITS = { custom_prompt: 500, closing: 100, excludes: 300, biz_type: 60, store_desc: 500 }

/** 예전 /settings AI 탭 말투 값 → 통일 어휘 */
const LEGACY_SETTINGS_TONE: Record<string, ReplyTone> = {
  warm: 'friendly', polite: 'formal', pro: 'expert', witty: 'witty', calm: 'simple', energetic: 'mz',
}

function pick<T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : fallback
}

function text(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  // 제어문자 제거 · 앞뒤 공백 정리 · 길이 상한
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}

/** 아무 입력이나 받아 유효한 ReplyVoice 로 만든다 (모르는 값은 기본값) */
export function normalizeReplyVoice(input: unknown, base: ReplyVoice = DEFAULT_REPLY_VOICE): ReplyVoice {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const rawTone = typeof o.tone === 'string' ? (LEGACY_SETTINGS_TONE[o.tone] ?? o.tone) : undefined
  const inc = (o.includes && typeof o.includes === 'object' ? o.includes : {}) as Record<string, unknown>
  const includes = { ...base.includes }
  for (const k of INCLUDE_KEYS) if (typeof inc[k] === 'boolean') includes[k] = inc[k] as boolean
  return {
    tone: pick(REPLY_TONES, rawTone, base.tone),
    length: pick(REPLY_LENGTHS, o.length, base.length),
    speaker_gender: pick(SPEAKER_GENDERS, o.speaker_gender, base.speaker_gender),
    speaker_age: pick(SPEAKER_AGES, o.speaker_age, base.speaker_age),
    customer_gender: pick(CUSTOMER_GENDERS, o.customer_gender, base.customer_gender),
    customer_age: pick(CUSTOMER_AGES, o.customer_age, base.customer_age),
    custom_prompt: 'custom_prompt' in o ? text(o.custom_prompt, LIMITS.custom_prompt) : base.custom_prompt,
    closing: 'closing' in o ? text(o.closing, LIMITS.closing) : base.closing,
    excludes: 'excludes' in o ? text(o.excludes, LIMITS.excludes) : base.excludes,
    includes,
    biz_type: 'biz_type' in o ? text(o.biz_type, LIMITS.biz_type) : base.biz_type,
    store_desc: 'store_desc' in o ? text(o.store_desc, LIMITS.store_desc) : base.store_desc,
  }
}

/**
 * 편집기 브라우저 저장값(localution:review_persona · ..._custom_prompt) → ReplyVoice 부분값.
 * 값이 하나도 없으면 null (옮길 것 없음).
 */
export function voiceFromLegacyEditor(
  personaJson: string | null | undefined,
  customPrompt: string | null | undefined,
): Partial<ReplyVoice> | null {
  let persona: Record<string, unknown> = {}
  if (personaJson) {
    try {
      const parsed = JSON.parse(personaJson)
      if (parsed && typeof parsed === 'object') persona = parsed as Record<string, unknown>
    } catch { /* 깨진 값은 옮기지 않는다 */ }
  }
  const out: Partial<ReplyVoice> = {}
  if (typeof persona.tone === 'string' && (REPLY_TONES as readonly string[]).includes(persona.tone)) out.tone = persona.tone as ReplyTone
  if (typeof persona.gender === 'string' && (CUSTOMER_GENDERS as readonly string[]).includes(persona.gender)) out.customer_gender = persona.gender as ReplyVoice['customer_gender']
  if (typeof persona.age === 'string' && (CUSTOMER_AGES as readonly string[]).includes(persona.age)) out.customer_age = persona.age as ReplyVoice['customer_age']
  const cp = text(customPrompt, LIMITS.custom_prompt)
  if (cp) out.custom_prompt = cp
  return Object.keys(out).length ? out : null
}

/**
 * 브라우저 값을 서버로 한 번 옮길지 판단.
 * · 서버 저장소가 준비돼 있고(ready) · 서버에 저장된 값이 아직 없고 · 옮길 값이 있고 · 이미 옮긴 적이 없을 때만.
 * 서버에 값이 이미 있으면 서버가 이긴다 (다른 기기에서 정한 값을 덮지 않는다).
 */
export function shouldMigrateLegacy(opts: {
  storage: 'ready' | 'missing' | 'error'
  serverSaved: boolean
  legacy: Partial<ReplyVoice> | null
  alreadyMigrated: boolean
}): boolean {
  return opts.storage === 'ready' && !opts.serverSaved && !!opts.legacy && !opts.alreadyMigrated
}

/** 자동답글 크론용 말투 — 크론이 모르는 말투는 가까운 값으로 */
export function toAutoreplyTone(tone: ReplyTone): typeof AUTOREPLY_TONES[number] {
  if ((AUTOREPLY_TONES as readonly string[]).includes(tone)) return tone as typeof AUTOREPLY_TONES[number]
  switch (tone) {
    case 'apologetic': return 'formal'
    case 'grateful':
    case 'gourmand':
    case 'auto':
    case 'custom':
    default: return 'friendly'
  }
}

/** ai-review-reply 요청 본문의 aiSettings · customerProfile · customPrompt */
export function toAiRequest(voice: ReplyVoice): {
  aiSettings: { tone: string; length: string; closing: string; excludes: string; includes: Record<string, boolean> }
  customerProfile: { gender: string; age: string }
  customPrompt?: string
} {
  return {
    aiSettings: {
      tone: voice.tone,
      length: voice.length,
      closing: voice.closing,
      excludes: voice.excludes,
      includes: { ...voice.includes },
    },
    customerProfile: { gender: voice.customer_gender, age: voice.customer_age },
    customPrompt: voice.tone === 'custom' && voice.custom_prompt ? voice.custom_prompt : undefined,
  }
}

/** Postgres/PostgREST '테이블 없음' 판정 — 마이그레이션 실행 전 환경 */
export function isMissingTableError(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42P01' || err.code === 'PGRST205') return true
  const m = String(err.message || '')
  return /does not exist|could not find the table|schema cache/i.test(m)
}
