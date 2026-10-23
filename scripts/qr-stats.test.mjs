// LU-018 W2-6 · QR 통계 집계 단언 테스트 (500행 잘림 해소)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), ts = require('typescript'), module = { exports: {} }
new Function('exports', 'module', ts.transpileModule(readFileSync(new URL('../app/lib/qr-stats.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(module.exports, module)
const { aggregateQrStats } = module.exports
const NOW = new Date('2026-10-23T03:00:00Z')
const row = (event_type, created_at = '2026-10-23T01:00:00Z', extra = {}) => ({ event_type, device_kind: 'mobile', visitor_hash: null, created_at, ...extra })

test('500행을 넘는 기록도 전부 센다', () => {
  const rows = Array.from({ length: 1700 }, (_, i) => row('scan', '2026-10-2' + (i % 3 + 1) + 'T01:00:00Z', { visitor_hash: 'v' + (i % 400) }))
  const a = aggregateQrStats(rows, 7, NOW)
  assert.equal(a.counts.scan, 1700)
  assert.equal(a.funnel.scan, 1700)
  assert.equal(a.unique_visitors, 400)
  assert.equal(a.devices.mobile, 1700)
  assert.equal(a.daily.reduce((s, d) => s + d.scan, 0), 1700)
})
test('퍼널 비율과 제출 종류 합산', () => {
  const rows = [...Array(10).fill(0).map(() => row('scan')), ...Array(4).fill(0).map(() => row('ai_generated')), row('submitted_naver'), row('submitted_google'), row('submitted_kakao')]
  const f = aggregateQrStats(rows, 1, NOW).funnel
  assert.deepEqual(f, { scan: 10, ai_generated: 4, submitted: 3, scan_to_ai_rate: 40, ai_to_submit_rate: 75, overall_rate: 30 })
})
test('빈 데이터 : 0 나누기 없음 · 기간만큼 빈 날짜', () => {
  const a = aggregateQrStats([], 7, NOW)
  assert.equal(a.daily.length, 7)
  assert.equal(a.daily[6].date, '2026-10-23')
  assert.equal(a.daily[0].date, '2026-10-17')
  assert.equal(a.funnel.overall_rate, 0)
})
test('event_type 없는 행은 무시', () => {
  const a = aggregateQrStats([row(null), row('')], 1, NOW)
  assert.deepEqual(a.counts, {})
})
