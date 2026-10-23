import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), ts = require('typescript')
const module = { exports: {} }
const code = ts.transpileModule(readFileSync(new URL('../app/lib/keyword-rank-view.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
new Function('exports', 'module', 'require', code)(module.exports, module, id => { throw Error('Unexpected dependency: ' + id) })
const { rankState, rankStateLabel, dailySeries, summarize, seoulDay } = module.exports

test('no record is never measured, not rank 0', () => {
  assert.equal(rankState(null).kind, 'never')
  assert.equal(rankStateLabel(rankState(undefined)), '아직 측정 전')
})
test('failed measurement (method none) is not a measured value', () => {
  assert.equal(rankState({ rank: null, total: 0, method: 'none', ts: '2026-10-20T00:00:00Z' }).kind, 'never')
})
test('rank null with a recorded scan is outside, never 0', () => {
  const s = rankState({ rank: null, total: 100, method: 'map_api', ts: '2026-10-20T00:00:00Z' })
  assert.equal(s.kind, 'outside')
  assert.match(rankStateLabel(s), /미노출/)
  assert.doesNotMatch(rankStateLabel(s), /0위/)
})
test('rank 0 or negative is treated as outside, never drawn as a rank', () => {
  assert.equal(rankState({ rank: 0, total: 50, method: 'map_api', ts: '2026-10-20T00:00:00Z' }).kind, 'outside')
})
test('measured rank is shown as is', () => {
  assert.equal(rankStateLabel(rankState({ rank: 7, total: 100, method: 'map_api', ts: '2026-10-20T00:00:00Z' })), '7위')
})
test('seoul day boundary', () => {
  assert.equal(seoulDay('2026-10-20T14:59:00Z'), '2026-10-20')
  assert.equal(seoulDay('2026-10-20T15:00:00Z'), '2026-10-21')
})
test('daily series keeps missing days empty and uses last measurement of a day', () => {
  const now = new Date('2026-10-23T03:00:00Z')
  const rows = [
    { rank: 9, total: 100, method: 'map_api', ts: '2026-10-21T21:00:00Z' },
    { rank: 5, total: 100, method: 'map_api', ts: '2026-10-22T05:00:00Z' },
    { rank: null, total: 100, method: 'map_api', ts: '2026-10-20T21:00:00Z' },
    { rank: null, total: 0, method: 'none', ts: '2026-10-19T21:00:00Z' },
  ]
  const s = dailySeries(rows, 5, now)
  assert.deepEqual(s.map(p => p.day), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])
  assert.equal(s[0].measured, false)
  assert.equal(s[1].measured, false)
  assert.equal(s[2].outside, true); assert.equal(s[2].rank, null)
  assert.equal(s[3].rank, 5)
  assert.equal(s[4].measured, false)
  const sum = summarize(s)
  assert.deepEqual(sum, { measuredDays: 2, outsideDays: 1, best: 5, worst: 5 })
})
test('series length is clamped', () => {
  assert.equal(dailySeries([], 30, new Date('2026-10-23T00:00:00Z')).length, 30)
  assert.equal(dailySeries([], 0, new Date('2026-10-23T00:00:00Z')).length, 1)
})
