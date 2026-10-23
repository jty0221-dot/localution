import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), ts = require('typescript')
const module = { exports: {} }
const code = ts.transpileModule(readFileSync(new URL('../app/lib/keyword-history-window.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
new Function('exports', 'module', 'require', code)(module.exports, module, id => { throw Error('Unexpected dependency: ' + id) })
const { collectRecentRows, historyDays, HISTORY_MAX_ROWS } = module.exports

// 가짜 DB: ts 내림차순으로 정렬된 행을 .range(from, to) 처럼 잘라 준다 (응답 상한 1000행 흉내)
function fakeDb(total, cap = 1000) {
  const desc = Array.from({ length: total }, (_, i) => ({ ts: total - 1 - i }))
  const calls = []
  const fetchPage = async (from, to) => { calls.push([from, to]); return { data: desc.slice(from, Math.min(to + 1, from + cap)), error: null } }
  return { fetchPage, calls }
}

test('cap covers 50 keywords x 31 days', () => {
  assert.ok(HISTORY_MAX_ROWS >= 50 * 31)
})
test('days is clamped to 1..31', () => {
  assert.equal(historyDays('365'), 31)
  assert.equal(historyDays('0'), 1)
  assert.equal(historyDays('abc'), 30)
  assert.equal(historyDays(null), 30)
  assert.equal(historyDays('7'), 7)
})
test('17 keywords x 30 days (510 rows, old 500 cap) returns all, newest kept, ascending', async () => {
  const { fetchPage } = fakeDb(510)
  const r = await collectRecentRows(fetchPage)
  assert.equal(r.rows.length, 510)
  assert.equal(r.truncated, false)
  assert.equal(r.rows[0].ts, 0)
  assert.equal(r.rows.at(-1).ts, 509)
})
test('pages past the 1000-row response cap', async () => {
  const { fetchPage, calls } = fakeDb(1550)
  const r = await collectRecentRows(fetchPage)
  assert.equal(r.rows.length, 1550)
  assert.ok(calls.length >= 2)
  assert.equal(r.rows.at(-1).ts, 1549)
})
test('over the cap drops the oldest, never the newest, and flags truncated', async () => {
  const { fetchPage } = fakeDb(HISTORY_MAX_ROWS + 10)
  const r = await collectRecentRows(fetchPage)
  assert.equal(r.rows.length, HISTORY_MAX_ROWS)
  assert.equal(r.truncated, true)
  assert.equal(r.rows.at(-1).ts, HISTORY_MAX_ROWS + 9)
  assert.equal(r.rows[0].ts, 10)
})
test('exactly at cap is not truncated', async () => {
  const { fetchPage } = fakeDb(HISTORY_MAX_ROWS)
  const r = await collectRecentRows(fetchPage)
  assert.equal(r.truncated, false)
})
test('db error surfaces', async () => {
  const r = await collectRecentRows(async () => ({ data: null, error: { message: 'boom' } }))
  assert.equal(r.error, 'boom')
})
