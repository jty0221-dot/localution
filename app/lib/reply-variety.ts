// app/lib/reply-variety.ts
// ============================================================
// 리뷰 답글 다양성 · 리뷰 파악 · 사진 매핑 코어 (2026-09-21 대표 지시)
//   "리뷰를 쓸때는 항상 주요 음식, 사진을 매핑, 대표키워드활용, 주요지역키워드 등
//    고루 활용해서 작성해야되고 해당 리뷰의 내용을 잘 파악하여 설정해야함.
//    특히 말투의 다양성을 만들고 활용할 수 있게 처리해"
//
//   · extractReviewSignals : 리뷰 본문에서 메뉴명 · 언급 포인트(맛 · 양 · 친절 · 대기 ...)를 잡는다
//   · pickVariation        : 리뷰마다 다른 구성(시작 · 끝 · 어미 · 키워드 조합)을 정한다 (seed 기반 · 재현 가능)
//   · resolveTone          : 'auto' 톤이면 리뷰 성격에 맞는 풀에서 돌려 가며 고른다
//   · buildVarietyLines    : 위 결정을 프롬프트 문장으로 바꾼다 (두 생성기가 같이 쓴다)
//   · firstSentence        : 최근 답글의 첫 문장을 뽑아 다음 답글이 같은 문장으로 시작하지 않게 한다
//
//   쓰는 곳 : app/lib/generate-naver-reply.ts (크론) · app/api/ai-review-reply/route.ts (화면)
//   DB 는 여기서 읽지 않는다. 메뉴 목록과 최근 답글은 호출자가 넘긴다 (loadStoreMenus · loadRecentOpeners 는 헬퍼).
// ============================================================

export type ReviewKind = 'positive' | 'negative' | 'neutral' | 'empty' | 'photo_only'

export interface ReviewSignals {
  menus: string[]     // 리뷰 본문에서 실제로 언급된 매장 메뉴 (매장 메뉴 목록과 대조)
  aspects: string[]   // 언급 포인트 라벨 (맛 · 양 · 가격 · 친절 · 분위기 · 위생 · 대기 · 주차 · 재방문 · 포장배달 · 아이동반 · 모임)
  quotes: string[]    // 답글에서 그대로 받아 줄 만한 짧은 구절 (최대 2개)
}

export interface Variation {
  tone: string
  structure: string
  opener: string
  closer: string
  ending: string
  keywords: string[]  // 이번 답글에 녹일 키워드 1~2개 (지역 · 대표 · 메뉴 · 매장명을 돌려 가며)
}

// ── 언급 포인트 사전 ─────────────────────────────────────────
const ASPECT_LEXICON: Record<string, string[]> = {
  '맛':      ['맛있', '맛나', '존맛', '꿀맛', '간이', '담백', '고소', '매콤', '달달', '짭짤', '바삭', '촉촉', '쫄깃', '부드럽', '진한', '깊은 맛', '감칠'],
  '양':      ['양이', '양도', '양은', '푸짐', '넉넉', '배부', '양 많'],
  '가격':    ['가격', '가성비', '저렴', '비싸', '합리', '착한'],
  '친절':    ['친절', '응대', '사장님', '직원', '설명', '챙겨', '서비스'],
  '분위기':  ['분위기', '인테리어', '아늑', '조용', '뷰', '감성', '예쁘', '음악', '조명'],
  '위생':    ['청결', '깨끗', '위생', '깔끔'],
  '대기':    ['웨이팅', '대기', '줄 서', '줄서', '기다', '예약'],
  '주차':    ['주차', '역에서', '도보', '위치', '근처', '접근', '찾기'],
  '재방문':  ['또 ', '재방문', '다시', '단골', '자주', '또올', '또 올', '또 갈', '또갈'],
  '포장배달': ['포장', '배달', '테이크아웃', '픽업'],
  '아이동반': ['아이', '아기', '유모차', '가족', '부모님', '어르신'],
  '모임':    ['회식', '모임', '단체', '데이트', '친구', '동료', '기념일', '생일'],
}

// ── seed (FNV-1a 32bit) · 같은 리뷰는 같은 구성, 다른 리뷰는 다른 구성 ──
export function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

function norm(s: string): string {
  return (s || '').replace(/\s+/g, '').toLowerCase()
}

// ── 리뷰 파악 ────────────────────────────────────────────────
export function extractReviewSignals(content: string, storeMenus: string[]): ReviewSignals {
  const text = content || ''
  const flat = norm(text)

  // 메뉴 대조 · 긴 이름부터 (예: "김치찌개 정식" 이 "김치찌개" 보다 먼저)
  const menus: string[] = []
  const sorted = Array.from(new Set(storeMenus.map(m => (m || '').trim()).filter(m => m.length >= 2)))
    .sort((a, b) => b.length - a.length)
  for (const m of sorted) {
    const key = norm(m)
    if (key.length < 2) continue
    if (flat.includes(key) && !menus.some(x => norm(x).includes(key))) menus.push(m)
    if (menus.length >= 3) break
  }

  const aspects: string[] = []
  for (const [label, lexemes] of Object.entries(ASPECT_LEXICON)) {
    if (lexemes.some(l => text.includes(l))) aspects.push(label)
  }

  // 받아 줄 구절 · 8~30자 문장 조각 중 앞의 둘
  const quotes = text
    .split(/[.!?\n~]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 8 && s.length <= 30)
    .slice(0, 2)

  return { menus, aspects, quotes }
}

// ── 톤 풀 · 'auto' 일 때 리뷰 성격에 맞춰 돌린다 ───────────────
const TONE_POOL: Record<'positive' | 'neutral' | 'negative', string[]> = {
  positive: ['friendly', 'witty', 'emo', 'mz', 'gourmand', 'grateful', 'simple'],
  neutral:  ['friendly', 'simple', 'expert', 'emo'],
  negative: ['apologetic', 'formal', 'expert'],
}

export function isAutoTone(tone: string | undefined | null): boolean {
  const t = String(tone || '').toLowerCase()
  return t === 'auto' || t === 'mix' || t === 'random' || t === 'rotate'
}

export function resolveTone(tone: string, kind: ReviewKind, seed: number): string {
  if (!isAutoTone(tone)) return tone || 'friendly'
  const pool = kind === 'negative' ? TONE_POOL.negative
    : kind === 'neutral' ? TONE_POOL.neutral
    : TONE_POOL.positive
  return pool[seed % pool.length]
}

// ── 구성 후보 ────────────────────────────────────────────────
const STRUCTURES = [
  '감사 한 마디 → 리뷰 포인트에 반응 → 매장 이야기(키워드 문장) → 마무리',
  '리뷰 포인트에 먼저 반응 → 매장 이야기 → 감사 → 마무리 (인사말을 앞에 두지 않는다)',
  '사진 또는 메뉴 장면 묘사 → 손님 문장을 받아서 → 키워드 문장 → 마무리',
  '공감 한 문장 → 구체 포인트 두 개 → 마무리 (감사 인사는 중간에 한 번만)',
  '손님이 고른 메뉴 이야기로 시작 → 그 메뉴를 만드는 방식 한 줄 → 감사 → 마무리',
]

const OPENERS = [
  '손님이 드신 메뉴 이름으로 첫 문장을 연다',
  '손님이 쓴 표현을 그대로 받아서 첫 문장을 연다',
  '짧은 감사 한 마디로 시작하되 "안녕하세요" 는 쓰지 않는다',
  '그날 상황을 짐작하는 공감 문장으로 시작한다 (예: 점심시간에 오셨군요)',
  '매장 쪽 이야기 한 줄로 시작한다 (예: 오늘 아침에도 같은 육수를 끓였는데)',
  '인사 없이 바로 본론으로 들어간다',
]
const OPENER_PHOTO = '사진에 보이는 장면(메뉴 · 플레이팅 · 자리)을 한 문장으로 짚으며 시작한다'

const CLOSERS = [
  '재방문을 권하는 한 문장으로 끝낸다',
  '다음에 드셔 볼 메뉴 하나를 추천하며 끝낸다',
  '계절이나 시간대 안내로 끝낸다 (예: 저녁엔 조금 한가해요)',
  '감사 인사 한 줄로 담백하게 끝낸다',
  '앞으로 어떻게 준비하겠다는 다짐 한 문장으로 끝낸다',
]

const ENDINGS = [
  '"~요" 위주 · 느낌표 0~1개',
  '"~습니다" 위주 · 담백하게 · 느낌표 없음',
  '"~요" 와 "~거든요" 를 섞어 말하듯이',
  '"~네요" · "~더라고요" 를 섞은 대화체',
]

// ── 키워드 풀 · 지역 · 대표 · 메뉴 · 매장명을 돌려 가며 ─────────
export function buildKeywordPool(opts: {
  region: string
  bizType: string
  storeName: string
  mainKeyword: string
  subKeywords: string
  menus: string[]
}): string[] {
  const { region, bizType, storeName, mainKeyword, subKeywords, menus } = opts
  const list: string[] = []
  const push = (k: string) => { const t = (k || '').trim(); if (t && !list.includes(t)) list.push(t) }
  // 이미 지역이 들어 있는 키워드에는 지역을 다시 붙이지 않는다 ('충무로 충무로 맛집' 방지)
  const withRegion = (k: string) => (!region || !k || norm(k).includes(norm(region))) ? k : `${region} ${k}`
  if (mainKeyword) push(withRegion(mainKeyword))
  if (bizType && bizType !== mainKeyword) push(withRegion(bizType))
  if (menus[0]) push(withRegion(menus[0]))
  push(mainKeyword)
  push(storeName)
  ;(subKeywords || '').split(/[,，、]/).forEach(push)
  menus.slice(0, 5).forEach(push)
  return list
}

export function pickVariation(opts: {
  seed: number
  tone: string
  kind: ReviewKind
  hasPhotos: boolean
  keywordPool: string[]
  reviewMenus: string[]
  region: string
}): Variation {
  const { seed, kind, hasPhotos, keywordPool, reviewMenus, region } = opts
  const tone = resolveTone(opts.tone, kind, seed)

  const s1 = seed % STRUCTURES.length
  const s2 = Math.floor(seed / 7) % OPENERS.length
  const s3 = Math.floor(seed / 31) % CLOSERS.length
  const s4 = Math.floor(seed / 101) % ENDINGS.length

  let opener = OPENERS[s2]
  if (hasPhotos && seed % 3 === 0) opener = OPENER_PHOTO
  if (!reviewMenus.length && opener === OPENERS[0]) opener = OPENERS[2]
  if (kind === 'negative') opener = '변명 없이 사과 문장으로 시작한다'

  // 키워드 : 리뷰가 언급한 메뉴가 있으면 그 메뉴를 지역과 묶어 1개 + 풀에서 회전 1개
  // 부정 리뷰는 0개 (사과에 키워드를 얹지 않는다) · 빈 리뷰 · 사진만은 1개 · 나머지 2개
  const maxKw = kind === 'negative' ? 0 : (kind === 'empty' || kind === 'photo_only') ? 1 : 2
  const keywords: string[] = []
  if (maxKw > 0 && reviewMenus[0]) keywords.push(region && !norm(reviewMenus[0]).includes(norm(region)) ? `${region} ${reviewMenus[0]}` : reviewMenus[0])
  if (keywordPool.length) {
    const start = Math.floor(seed / 13) % keywordPool.length
    for (let i = 0; i < keywordPool.length && keywords.length < maxKw; i++) {
      const k = keywordPool[(start + i) % keywordPool.length]
      if (!keywords.some(x => norm(x).includes(norm(k)) || norm(k).includes(norm(x)))) keywords.push(k)
    }
  }

  return {
    tone,
    structure: STRUCTURES[s1],
    opener,
    closer: kind === 'negative' ? '다시 방문하실 때 어떻게 달라져 있을지 한 문장으로 끝낸다' : CLOSERS[s3],
    ending: ENDINGS[s4],
    keywords: keywords.slice(0, maxKw),
  }
}

// ── 프롬프트 문장 ────────────────────────────────────────────
export function buildVarietyLines(opts: {
  variation: Variation
  signals: ReviewSignals
  kind: ReviewKind
  hasPhotos: boolean
  storeMenus: string[]
  recentOpeners: string[]
}): string[] {
  const { variation: v, signals, kind, hasPhotos, storeMenus, recentOpeners } = opts
  const lines: string[] = []

  lines.push('[리뷰에서 잡힌 포인트 · 여기에 직접 반응한다]')
  if (signals.menus.length) lines.push('- 손님이 언급한 메뉴: ' + signals.menus.join(', ') + ' (이 이름 그대로 부른다)')
  if (signals.aspects.length) lines.push('- 손님이 말한 포인트: ' + signals.aspects.join(' · '))
  if (signals.quotes.length) lines.push('- 받아 줄 만한 손님 표현: ' + signals.quotes.map(q => '"' + q + '"').join(', '))
  if (!signals.menus.length && !signals.aspects.length && !signals.quotes.length) {
    lines.push('- 본문에서 특정 메뉴나 포인트가 잡히지 않았다. 사진이나 별점에서 읽히는 것으로 대신한다. 없는 사실을 지어내지 않는다.')
  }
  lines.push('- 리뷰가 말하지 않은 것을 칭찬받은 것처럼 쓰지 않는다. 포인트가 하나면 하나에만 깊게 반응한다.')
  lines.push('')

  if (hasPhotos) {
    lines.push('[사진 매핑]')
    if (storeMenus.length) {
      lines.push('- 사진 속 음식이 아래 매장 메뉴 중 무엇인지 고르고, 그 메뉴명 그대로 부른다: ' + storeMenus.slice(0, 20).join(', '))
      lines.push('- 목록에 없거나 확신이 없으면 메뉴명을 단정하지 말고 보이는 대로 말한다 (예: 국물 요리 · 구이).')
    } else {
      lines.push('- 사진에 보이는 음식 · 플레이팅 · 자리를 구체 명사로 짚는다. 메뉴명이 확실치 않으면 일반명으로 말한다.')
    }
    lines.push('- 사진에 없는 것을 있는 것처럼 쓰지 않는다.')
    lines.push('')
  }

  lines.push('[이번 답글의 구성 · 리뷰마다 다르게 간다]')
  lines.push('- 구조: ' + v.structure)
  lines.push('- 첫 문장: ' + v.opener)
  lines.push('- 마지막 문장: ' + v.closer)
  lines.push('- 어미: ' + v.ending)
  if (v.keywords.length && kind !== 'negative') {
    lines.push('- 이번에 녹일 키워드 (각 1회 · 문맥에 안 맞으면 뺀다): ' + v.keywords.join(' / '))
  }
  lines.push('')

  const recent = recentOpeners.map(s => (s || '').trim()).filter(Boolean).slice(0, 8)
  if (recent.length) {
    lines.push('[최근 답글과 겹치지 않게]')
    lines.push('- 아래 문장들과 같은 첫 문장 · 같은 마지막 문장을 쓰지 않는다:')
    recent.forEach(r => lines.push('  · ' + r))
    lines.push('- "소중한 리뷰 감사합니다" · "방문해 주셔서 감사합니다" 처럼 어느 가게에나 붙는 문장으로 시작하지 않는다.')
    lines.push('')
  }

  return lines
}

// ── 최근 답글 첫 문장 ────────────────────────────────────────
export function firstSentence(text: string, max = 40): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const m = t.match(/^(.+?[.!?~])(\s|$)/)
  const s = (m ? m[1] : t).trim()
  return s.length > max ? s.slice(0, max) : s
}

// ── DB 헬퍼 · Supabase 서비스 클라이언트를 받아 쓴다 (실패해도 빈 배열) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function loadStoreMenus(svc: AnyClient, userId: string, limit = 30): Promise<string[]> {
  try {
    const { data } = await svc
      .from('menu_items')
      .select('name_ko, is_signature, display_order')
      .eq('user_id', userId)
      .eq('active', true)
      .order('is_signature', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(limit)
    const out: string[] = []
    for (const r of (data || []) as Array<{ name_ko?: string }>) {
      const n = (r.name_ko || '').trim()
      if (n && !out.includes(n)) out.push(n)
    }
    return out
  } catch {
    return []
  }
}

export async function loadRecentOpeners(svc: AnyClient, userId: string, limit = 8): Promise<string[]> {
  try {
    const { data } = await svc
      .from('platform_reviews')
      .select('draft_reply, posted_at')
      .eq('user_id', userId)
      .not('draft_reply', 'is', null)
      .order('posted_at', { ascending: false })
      .limit(limit * 3)
    const out: string[] = []
    for (const r of (data || []) as Array<{ draft_reply?: string }>) {
      const s = firstSentence(r.draft_reply || '')
      if (s && !out.includes(s)) out.push(s)
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}
