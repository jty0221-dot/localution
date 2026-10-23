import assert from 'node:assert/strict'
import {
  DEFAULT_REPLY_VOICE, normalizeReplyVoice, voiceFromLegacyEditor, shouldMigrateLegacy,
  toAutoreplyTone, toAiRequest, isMissingTableError, AUTOREPLY_TONES,
} from '../app/lib/reply-voice.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

check('빈 입력 → 기본값', () => {
  assert.deepEqual(normalizeReplyVoice(undefined), DEFAULT_REPLY_VOICE)
  assert.deepEqual(normalizeReplyVoice('garbage'), DEFAULT_REPLY_VOICE)
})

check('모르는 값은 버리고 아는 값만', () => {
  const v = normalizeReplyVoice({ tone: 'shouting', length: 'long', speaker_gender: 'x', customer_age: '30s', includes: { thanks: false, hack: true } })
  assert.equal(v.tone, 'friendly')
  assert.equal(v.length, 'long')
  assert.equal(v.speaker_gender, 'none')
  assert.equal(v.customer_age, '30s')
  assert.equal(v.includes.thanks, false)
  assert.equal('hack' in v.includes, false)
})

check('예전 설정 화면 말투 값 → 통일 어휘', () => {
  assert.equal(normalizeReplyVoice({ tone: 'warm' }).tone, 'friendly')
  assert.equal(normalizeReplyVoice({ tone: 'polite' }).tone, 'formal')
  assert.equal(normalizeReplyVoice({ tone: 'pro' }).tone, 'expert')
  assert.equal(normalizeReplyVoice({ tone: 'calm' }).tone, 'simple')
  assert.equal(normalizeReplyVoice({ tone: 'energetic' }).tone, 'mz')
})

check('글자 길이 상한 · 제어문자 제거', () => {
  const v = normalizeReplyVoice({ custom_prompt: 'a'.repeat(900), closing: '  고마워요\u0007  ' })
  assert.equal(v.custom_prompt.length, 500)
  assert.equal(v.closing, '고마워요')
})

check('부분 저장은 기존 값 위에 덮는다 (다른 항목을 지우지 않음)', () => {
  const base = normalizeReplyVoice({ tone: 'expert', closing: '감사합니다', length: 'short' })
  const next = normalizeReplyVoice({ tone: 'witty', customer_gender: 'female' }, base)
  assert.equal(next.tone, 'witty')
  assert.equal(next.closing, '감사합니다')
  assert.equal(next.length, 'short')
  assert.equal(next.customer_gender, 'female')
})

check('편집기 브라우저 값 읽기', () => {
  assert.deepEqual(
    voiceFromLegacyEditor(JSON.stringify({ tone: 'custom', gender: 'male', age: '40s' }), '  소박하게  '),
    { tone: 'custom', customer_gender: 'male', customer_age: '40s', custom_prompt: '소박하게' },
  )
  assert.equal(voiceFromLegacyEditor(null, ''), null)
  assert.equal(voiceFromLegacyEditor('{broken', null), null)
  assert.deepEqual(voiceFromLegacyEditor('{broken', '맞춤'), { custom_prompt: '맞춤' })
  assert.deepEqual(voiceFromLegacyEditor(JSON.stringify({ tone: 'nope', gender: 'neutral' }), null), null)
})

check('한 번만 옮긴다 — 서버 값이 있으면 서버가 이긴다', () => {
  const legacy = { tone: 'mz' }
  assert.equal(shouldMigrateLegacy({ storage: 'ready', serverSaved: false, legacy, alreadyMigrated: false }), true)
  assert.equal(shouldMigrateLegacy({ storage: 'ready', serverSaved: true, legacy, alreadyMigrated: false }), false)
  assert.equal(shouldMigrateLegacy({ storage: 'ready', serverSaved: false, legacy, alreadyMigrated: true }), false)
  assert.equal(shouldMigrateLegacy({ storage: 'missing', serverSaved: false, legacy, alreadyMigrated: false }), false)
  assert.equal(shouldMigrateLegacy({ storage: 'ready', serverSaved: false, legacy: null, alreadyMigrated: false }), false)
})

check('자동답글 말투 — 크론이 아는 값으로만', () => {
  for (const t of ['auto', 'friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal', 'grateful', 'apologetic', 'gourmand', 'custom']) {
    assert.ok(AUTOREPLY_TONES.includes(toAutoreplyTone(t)), t)
  }
  assert.equal(toAutoreplyTone('expert'), 'expert')
  assert.equal(toAutoreplyTone('apologetic'), 'formal')
  assert.equal(toAutoreplyTone('custom'), 'friendly')
})

check('AI 요청 본문 — 맞춤 지시는 custom 일 때만', () => {
  const a = toAiRequest(normalizeReplyVoice({ tone: 'custom', custom_prompt: '정중히', length: 'long', closing: '또 오세요' }))
  assert.equal(a.customPrompt, '정중히')
  assert.equal(a.aiSettings.length, 'long')
  assert.equal(a.aiSettings.closing, '또 오세요')
  const b = toAiRequest(normalizeReplyVoice({ tone: 'friendly', custom_prompt: '정중히' }))
  assert.equal(b.customPrompt, undefined)
  assert.deepEqual(b.customerProfile, { gender: 'none', age: '' })
})

check('테이블 없음 판정', () => {
  assert.equal(isMissingTableError({ code: '42P01', message: 'relation does not exist' }), true)
  assert.equal(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.reply_voice_settings' in the schema cache" }), true)
  assert.equal(isMissingTableError({ code: '23505', message: 'duplicate key' }), false)
  assert.equal(isMissingTableError(null), false)
})

console.log(`reply-voice: ${count} checks passed`)
