// LU-018 W2-4 · W2-5 · 고객 CRM 순수 로직 단언 테스트
// 실행 : node --test scripts/customer-crm.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cache = new Map()
function load(rel) {
  const file = path.resolve(root, rel.endsWith('.ts') ? rel : rel + '.ts')
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }
  cache.set(file, module)
  const out = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const localRequire = spec => spec.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(file), spec))) : require(spec)
  new Function('exports', 'module', 'require', out)(module.exports, module, localRequire)
  return module.exports
}

const life = load('app/lib/customer-lifecycle')
const errs = load('app/lib/crm-db-errors')
const save = load('app/lib/customer-save-status')
const revisit = load('app/lib/revisit-analysis')

const NOW = new Date('2026-10-23T03:00:00Z') // KST 2026-10-23 12:00
const daysAgo = n => new Date(NOW.getTime() - n * 86400000).toISOString()

// ---------- 자동 태그 (W2-4 첫 방문 단골 오류 · W2-5 휴면) ----------
test('기준은 재방문 분석과 같다', () => {
  assert.equal(revisit.DORMANT_DAYS, 90)
  assert.equal(revisit.REGULAR_MIN_VISITS, 2)
})
test('첫 방문은 신규 (단골 아님)', () => {
  assert.equal(life.lifecycleTag({ visits: 1, lastVisitAt: NOW.toISOString() }, NOW), '신규')
  assert.deepEqual(life.applyLifecycleTags([], { visits: 1, lastVisitAt: NOW.toISOString() }, NOW), ['신규'])
})
test('2회부터 단골 · 신규 태그는 빠진다', () => {
  assert.deepEqual(life.applyLifecycleTags(['신규'], { visits: 2, lastVisitAt: NOW.toISOString() }, NOW), ['단골'])
})
test('90일은 아직 활동 · 91일부터 휴면', () => {
  assert.equal(life.lifecycleTag({ visits: 5, lastVisitAt: daysAgo(90) }, NOW), '단골')
  assert.equal(life.lifecycleTag({ visits: 5, lastVisitAt: daysAgo(91) }, NOW), '휴면')
  assert.equal(life.lifecycleTag({ visits: 1, lastVisitAt: daysAgo(200) }, NOW), '휴면')
})
test('YYYY-MM-DD 날짜도 KST 일 단위로 센다', () => {
  assert.equal(life.lifecycleTag({ visits: 3, lastVisitAt: '2026-07-25' }, NOW), '단골') // 90일
  assert.equal(life.lifecycleTag({ visits: 3, lastVisitAt: '2026-07-24' }, NOW), '휴면') // 91일
})
test('KST 자정 경계 : UTC 로는 전날이어도 KST 날짜로 판정', () => {
  // 2026-07-24T15:30Z = KST 2026-07-25 00:30 → 90일 → 아직 단골
  assert.equal(life.lifecycleTag({ visits: 3, lastVisitAt: '2026-07-24T15:30:00Z' }, NOW), '단골')
})
test('VIP · 블랙리스트는 유지하고 자동 태그만 교체', () => {
  assert.deepEqual(life.applyLifecycleTags(['VIP', '단골', '블랙리스트'], { visits: 4, lastVisitAt: daysAgo(120) }, NOW), ['VIP', '블랙리스트', '휴면'])
})
test('방문 기록이 없으면 사장님이 고른 태그를 건드리지 않는다', () => {
  assert.equal(life.lifecycleTag({ visits: 0, lastVisitAt: null }, NOW), null)
  assert.deepEqual(life.applyLifecycleTags(['단골'], { visits: 0, lastVisitAt: '' }, NOW), ['단골'])
})
test('잘못된 날짜 · 음수 방문은 안전하게', () => {
  assert.equal(life.lifecycleTag({ visits: -3, lastVisitAt: 'not-a-date' }, NOW), null)
  assert.equal(life.lifecycleTag({ visits: 2, lastVisitAt: 'not-a-date' }, NOW), '단골')
})
test('sameTags', () => {
  assert.equal(life.sameTags(['a', 'b'], ['a', 'b']), true)
  assert.equal(life.sameTags(['a', 'b'], ['b', 'a']), false)
})

// ---------- DB 오류 분류 (마이그레이션 전/후 분기) ----------
test('uuid 소유 키 오류만 22P02 + uuid 메시지', () => {
  assert.equal(errs.isUuidOwnerKeyError({ code: '22P02', message: 'invalid input syntax for type uuid: "abc"' }), true)
  assert.equal(errs.isUuidOwnerKeyError({ code: '22P02', message: 'invalid input syntax for type integer' }), false)
  assert.equal(errs.isUuidOwnerKeyError({ code: '23505', message: 'uuid' }), false)
  assert.equal(errs.isUuidOwnerKeyError(null), false)
})
test('없는 열 : 42703 · PGRST204 · 열 이름 지정', () => {
  assert.equal(errs.isMissingColumnError({ code: '42703', message: 'column customers.consent_marketing does not exist' }, 'consent_marketing'), true)
  assert.equal(errs.isMissingColumnError({ code: 'PGRST204', message: "Could not find the 'consent_marketing' column of 'customers' in the schema cache" }, 'consent_marketing'), true)
  assert.equal(errs.isMissingColumnError({ code: '42703', message: 'column x does not exist' }, 'consent_marketing'), false)
  assert.equal(errs.isMissingColumnError({ code: '22P02', message: 'consent_marketing' }), false)
})
test('실패 분류는 원문을 남기지 않는 짧은 이름', () => {
  assert.equal(errs.classifyCrmSyncError({ code: '22P02', message: 'invalid input syntax for type uuid: "x"' }), 'owner_key_uuid')
  assert.equal(errs.classifyCrmSyncError({ code: '23505', message: 'dup' }), 'duplicate')
  assert.equal(errs.classifyCrmSyncError({ code: 'XX000', message: '01012345678' }), 'db_error')
  assert.equal(errs.classifyCrmSyncError(undefined), 'unknown')
})

// ---------- 저장 실패 문구 ('저장 못 함') ----------
test('409 계정 연결 필요는 저장 못 함으로 보인다', () => {
  const m = save.describeCustomerSaveFailure(409, { code: 'identity_mapping_required', error: '연결 확인 필요' })
  assert.ok(m.startsWith('저장 못 함'))
  assert.ok(m.includes('연결 확인 필요'))
})
test('중복 전화 · 503 · 네트워크 · 500 모두 저장 못 함', () => {
  for (const [status, body] of [[409, { code: 'duplicate_phone' }], [503, null], [0, null], [500, { error: '' }]]) {
    assert.ok(save.describeCustomerSaveFailure(status, body).startsWith('저장 못 함'), String(status))
  }
})
test('게스트(401/403)는 저장 막힘이 아니다', () => {
  assert.equal(save.isServerSaveBlocked(401), false)
  assert.equal(save.isServerSaveBlocked(403), false)
  assert.equal(save.isServerSaveBlocked(409), true)
  assert.equal(save.isServerSaveBlocked(0), true)
  assert.equal(save.isServerSaveBlocked(200), false)
})

// ---------- 소유 키 결정 : 마이그레이션 전/후 ----------
let identityCalls = 0
let identityAnswer = { ok: false, status: 409, code: 'identity_mapping_required', error: 'x' }
cache.set(path.resolve(root, 'app/lib/verified-identity.ts'), { exports: { resolveVerifiedIdentity: async () => { identityCalls++; return identityAnswer } } })
const owner = load('app/lib/customer-owner')
const UUID_ERR = { code: '22P02', message: 'invalid input syntax for type uuid: "nanoid"' }
test('마이그레이션 후 : 원래 ID 로 바로 성공 · env 연결 경로 안 탐', async () => {
  identityCalls = 0
  const r = await owner.runWithCustomerOwner({ ok: true, userId: 'nanoid', email: null, source: 'localution' }, async id => ({ error: null, id }))
  assert.equal(r.ok, true); assert.equal(r.via, 'direct'); assert.equal(r.ownerId, 'nanoid'); assert.equal(identityCalls, 0)
})
test('마이그레이션 전 · 연결 없음 : 409 그대로', async () => {
  identityCalls = 0
  identityAnswer = { ok: false, status: 409, code: 'identity_mapping_required', error: 'x' }
  const r = await owner.runWithCustomerOwner({ ok: true, userId: 'nanoid', email: null, source: 'localution' }, async () => ({ error: UUID_ERR }))
  assert.equal(r.ok, false); assert.equal(r.status, 409); assert.equal(identityCalls, 1)
})
test('마이그레이션 전 · env 연결 있음 : 연결된 uuid 로 재시도', async () => {
  identityAnswer = { ok: true, userId: '11111111-1111-1111-1111-111111111111' }
  const seen = []
  const r = await owner.runWithCustomerOwner({ ok: true, userId: 'nanoid', email: null, source: 'localution' }, async id => { seen.push(id); return { error: id === 'nanoid' ? UUID_ERR : null } })
  assert.equal(r.ok, true); assert.equal(r.via, 'binding'); assert.deepEqual(seen, ['nanoid', '11111111-1111-1111-1111-111111111111'])
})
test('Supabase 사장님은 uuid 오류가 나도 재시도하지 않는다', async () => {
  identityCalls = 0
  const r = await owner.runWithCustomerOwner({ ok: true, userId: 'u', email: null, source: 'supabase' }, async () => ({ error: UUID_ERR }))
  assert.equal(r.ok, true); assert.equal(r.via, 'direct'); assert.equal(identityCalls, 0)
})
