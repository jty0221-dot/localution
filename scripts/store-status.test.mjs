import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../app/lib/store-status.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const module = { exports: {} }
new Function('exports', 'module', compiled)(module.exports, module)
const S = module.exports

const NOW = '2026-10-23T03:00:00.000Z' // KST 10/23 12:00

test('합산 점수 · 등급 출력이 없다', () => {
  assert.ok(!/place_score|calcStoreScore|calcPlaceScore|grade/.test(source.replace(/^\s*\/\/.*$/gm, '')), 'score fields must not be read')
  const metrics = S.buildPlaceMetrics([{ ts: NOW, visitor_review_count: 10, blog_review_count: 5, rating: 4.5, source: 'cron' }])
  for (const m of metrics) assert.deepEqual(Object.keys(m).sort(), ['change', 'key', 'label', 'measuredAt', 'source', 'state', 'unit', 'value'])
})

test('측정 전 : 스냅샷이 없으면 not_yet · 값 null', () => {
  for (const rows of [null, []]) {
    const m = S.buildPlaceMetrics(rows)
    assert.equal(m.length, 3)
    for (const x of m) { assert.equal(x.state, 'not_yet'); assert.equal(x.value, null); assert.equal(x.change, null); assert.equal(x.measuredAt, null) }
  }
})

test('측정 불가 : 스냅샷은 있는데 값이 null 이면 unavailable · 0 점 평점도 측정 불가', () => {
  const m = S.buildPlaceMetrics([{ ts: NOW, visitor_review_count: null, blog_review_count: 3, rating: 0, source: 'manual' }])
  assert.equal(m[0].state, 'unavailable'); assert.equal(m[0].value, null); assert.equal(m[0].measuredAt, NOW)
  assert.equal(m[1].state, 'measured'); assert.equal(m[1].value, 3); assert.equal(m[1].source, '네이버 플레이스 직접 조회')
  assert.equal(m[2].state, 'unavailable')
})

test('변화 : 지난 측정(이전 KST 날짜) 대비 숫자 그대로 · 변화 없음은 same', () => {
  const rows = [
    { ts: '2026-10-23T01:00:00Z', visitor_review_count: 120, blog_review_count: 40, rating: '4.52', source: 'cron' },
    { ts: '2026-10-22T01:00:00Z', visitor_review_count: 115, blog_review_count: 40, rating: '4.50', source: 'cron' },
  ]
  const [v, b, r] = S.buildPlaceMetrics(rows)
  assert.deepEqual([v.change.kind, v.change.diff, v.change.previous], ['up', 5, 115])
  assert.equal(b.change.kind, 'same'); assert.equal(b.change.diff, 0)
  assert.equal(r.change.kind, 'up'); assert.equal(r.change.diff, 0.02)
})

test('KST 경계 : 같은 KST 날짜의 두 측정은 변화로 보지 않는다', () => {
  // UTC 로는 10/22 와 10/23 이지만 KST 로는 둘 다 10/23
  const rows = [
    { ts: '2026-10-23T05:00:00Z', visitor_review_count: 130, blog_review_count: 1, rating: 4, source: 'cron' },
    { ts: '2026-10-22T15:30:00Z', visitor_review_count: 100, blog_review_count: 1, rating: 4, source: 'cron' },
  ]
  assert.equal(S.buildPlaceMetrics(rows)[0].change, null)
  // KST 10/22 23:59 과 10/23 00:01 은 다른 날
  const rows2 = [
    { ts: '2026-10-22T15:01:00Z', visitor_review_count: 101, blog_review_count: 1, rating: 4 },
    { ts: '2026-10-22T14:59:00Z', visitor_review_count: 100, blog_review_count: 1, rating: 4 },
  ]
  assert.equal(S.buildPlaceMetrics(rows2)[0].change.diff, 1)
  assert.equal(S.toKstDate('2026-10-22T15:00:00Z'), '2026-10-23')
  assert.equal(S.toKstDate('2026-10-22T14:59:59Z'), '2026-10-22')
})

test('리뷰 : 빈 데이터는 not_yet · 0', () => {
  const r = S.buildReviewSummary([], NOW)
  assert.equal(r.state, 'not_yet'); assert.equal(r.unreplied, 0); assert.equal(r.avgRating, null)
  assert.equal(S.buildReviewSummary(null, NOW).state, 'not_yet')
})

test('리뷰 : 미답글은 stores/me 기준 (has_reply 또는 submitted 면 답글 완료)', () => {
  const rows = [
    { rating: 5, has_reply: false, reply_status: null, posted_at: null, collected_at: '2026-10-20T00:00:00Z' },
    { rating: 4, has_reply: false, reply_status: 'submitted', posted_at: null, collected_at: null },
    { rating: 3, has_reply: true, reply_status: null, posted_at: null, collected_at: '2026-10-22T00:00:00Z' },
    { rating: null, has_reply: null, reply_status: 'draft', posted_at: null, collected_at: null },
    { rating: 0, has_reply: false, reply_status: 'failed', posted_at: null, collected_at: null },
  ]
  const r = S.buildReviewSummary(rows, NOW)
  assert.equal(r.total, 5); assert.equal(r.unreplied, 3)
  assert.equal(r.avgRating, 4); assert.equal(r.ratedCount, 3)
  assert.equal(r.measuredAt, '2026-10-22T00:00:00Z')
})

test('리뷰 : 최근 7일은 KST 달력 기준(오늘 포함 7일)', () => {
  // NOW = KST 10/23 → 창 시작 KST 10/17 00:00 = UTC 10/16 15:00
  assert.equal(S.kstWindowStartIso(NOW, 7), '2026-10-16T15:00:00.000Z')
  const mk = posted_at => ({ rating: 5, has_reply: true, reply_status: null, posted_at, collected_at: null })
  const r = S.buildReviewSummary([mk('2026-10-16T15:00:00Z'), mk('2026-10-16T14:59:59Z'), mk('2026-10-23T02:00:00Z'), mk('2026-10-24T00:00:00Z'), mk('bad')], NOW)
  assert.equal(r.newLast7Days, 2)
})

test('키워드 : 권외 · 측정 불가 · 측정 전 · 순위 변화 문장', () => {
  const targets = [{ id: 'a', keyword: '부천 카페' }, { id: 'b', keyword: '부천 브런치' }, { id: 'c', keyword: '상동 카페' }, { id: 'd', keyword: '중동 카페' }, { id: 'e', keyword: '송내 카페' }]
  const rows = [
    { keyword_target_id: 'a', keyword: '부천 카페', rank: 3, total: 100, method: 'map_api', ts: '2026-10-23T01:00:00Z' },
    { keyword_target_id: 'a', keyword: '부천 카페', rank: 5, total: 100, method: 'map_api', ts: '2026-10-22T01:00:00Z' },
    { keyword_target_id: 'b', keyword: '부천 브런치', rank: null, total: 100, method: 'map_api', ts: '2026-10-23T01:00:00Z' },
    { keyword_target_id: 'b', keyword: '부천 브런치', rank: 40, total: 100, method: 'map_api', ts: '2026-10-21T01:00:00Z' },
    { keyword_target_id: 'c', keyword: '상동 카페', rank: null, total: null, method: 'none', ts: '2026-10-23T01:00:00Z' },
    { keyword_target_id: 'd', keyword: '중동 카페', rank: 7, total: 50, method: 'map_api', ts: '2026-10-23T01:00:00Z' },
    { keyword_target_id: 'd', keyword: '중동 카페', rank: 7, total: 50, method: 'map_api', ts: '2026-10-22T01:00:00Z' },
  ]
  const [a, b, c, d, e] = S.buildKeywordStatuses(targets, rows)
  assert.equal(a.state, 'ranked'); assert.equal(a.rank, 3); assert.equal(a.change, 'up'); assert.equal(a.changeText, '5위 → 3위 (2계단 올라감)')
  assert.equal(b.state, 'out_of_range'); assert.equal(b.rank, null); assert.equal(b.changeText, '40위 → 권외'); assert.equal(b.change, 'down')
  assert.equal(c.state, 'unavailable'); assert.equal(c.changeText, null)
  assert.equal(d.change, 'same'); assert.equal(d.changeText, '변화 없음')
  assert.equal(e.state, 'not_yet'); assert.equal(e.measuredAt, null)
  assert.deepEqual(S.buildKeywordStatuses(null, null), [])
  assert.deepEqual(S.rankChange({ state: 'ranked', rank: 9 }, { state: 'out_of_range', rank: null }), { text: '권외 → 9위', kind: 'up' })
  assert.deepEqual(S.rankChange({ state: 'out_of_range', rank: null }, { state: 'out_of_range', rank: null }), { text: '변화 없음 (권외)', kind: 'same' })
})

test('스탬프 : 카드 없음 · 조회 실패 · 이번 달 KST 경계', () => {
  assert.equal(S.buildStampSummary({ hasCard: false, available: true, events: [], nowIso: NOW }).state, 'no_card')
  assert.equal(S.buildStampSummary({ hasCard: true, available: false, events: [], nowIso: NOW }).state, 'unavailable')
  const empty = S.buildStampSummary({ hasCard: true, available: true, events: [], nowIso: NOW })
  assert.equal(empty.state, 'measured'); assert.equal(empty.thisMonth, 0); assert.equal(empty.change.kind, 'same')
  // NOW KST 2026-11-01 00:30 → UTC 10/31 15:30
  const now = '2026-10-31T15:30:00Z'
  const s = S.buildStampSummary({ hasCard: true, available: true, nowIso: now, events: [
    { collection_id: 'x', created_at: '2026-10-31T15:10:00Z' }, // KST 11/01
    { collection_id: 'x', created_at: '2026-10-31T15:20:00Z' }, // KST 11/01
    { collection_id: 'y', created_at: '2026-10-31T14:50:00Z' }, // KST 10/31
    { collection_id: 'z', created_at: '2026-09-30T16:00:00Z' }, // KST 10/01
    { collection_id: 'w', created_at: '2026-09-30T14:00:00Z' }, // KST 09/30 → 범위 밖
  ] })
  assert.equal(s.month, '2026-11'); assert.equal(s.thisMonth, 2); assert.equal(s.customersThisMonth, 1)
  assert.equal(s.lastMonth, 2); assert.equal(s.change.kind, 'same')
  assert.equal(S.kstPrevMonthStartIso(now), '2026-09-30T15:00:00.000Z')
})

test('오늘 할 일 : 실제 데이터로 판정 · 최대 3개 · 모르면 걸지 않는다', () => {
  const all = S.buildTodos({ unreplied: 4, hasPlaceTarget: true, checklistChecked: 10, hasStampCard: false })
  assert.deepEqual(all.map(t => t.id), ['unreplied', 'place-checklist', 'stamp-card'])
  assert.equal(all[0].href, '/review-admin'); assert.equal(all[0].title, '답글 안 단 리뷰 4건')
  assert.equal(all[1].title, '플레이스 점검 24개 남음')
  assert.deepEqual(S.buildTodos({ unreplied: null, hasPlaceTarget: null, checklistChecked: null, hasStampCard: null }), [])
  assert.deepEqual(S.buildTodos({ unreplied: 0, hasPlaceTarget: true, checklistChecked: 34, hasStampCard: true }), [])
  assert.deepEqual(S.buildTodos({ unreplied: 0, hasPlaceTarget: false, checklistChecked: 5, hasStampCard: true }).map(t => t.id), ['place-target'])
  assert.equal(S.buildTodos({ unreplied: 1, hasPlaceTarget: false, checklistChecked: 0, hasStampCard: false }).length, 3)
  assert.equal(S.buildTodos({ unreplied: 1, hasPlaceTarget: true, checklistChecked: 99, hasStampCard: true }).length, 1)
})

test('점검표 저장값 세기', () => {
  assert.equal(S.countChecklist(null), 0)
  assert.equal(S.countChecklist('{"a":true,"b":false,"c":true}'), 2)
  assert.equal(S.countChecklist('not json'), null)
  assert.equal(S.countChecklist('[1,2]'), null)
})
