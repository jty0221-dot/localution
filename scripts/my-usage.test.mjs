import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { countOrNull, isUsageAllZero, hasUnknownUsage } from '../app/lib/my-usage.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

check('count 응답 — 오류는 0 이 아니라 null', () => {
  assert.equal(countOrNull({ count: 3, error: null }), 3)
  assert.equal(countOrNull({ count: 0, error: null }), 0)
  assert.equal(countOrNull({ count: 5, error: { message: 'boom' } }), null)
  assert.equal(countOrNull({ count: null, error: null }), null)
  assert.equal(countOrNull(null), null)
  assert.equal(countOrNull({ count: -1 }), null)
})

check('전부 0 안내는 세 칸을 다 알 때만', () => {
  assert.equal(isUsageAllZero({ stores: 0, customers: 0, platforms: 0 }), true)
  assert.equal(isUsageAllZero({ stores: 0, customers: null, platforms: 0 }), false)
  assert.equal(isUsageAllZero({ stores: 1, customers: 0, platforms: 0 }), false)
  assert.equal(isUsageAllZero(null), false)
})

check('모르는 칸 판정', () => {
  assert.equal(hasUnknownUsage({ stores: 1, customers: 2, platforms: 3 }), false)
  assert.equal(hasUnknownUsage({ stores: 1, customers: null, platforms: 3 }), true)
  assert.equal(hasUnknownUsage(null), true)
})

check('정적 확인 — /my 는 더 이상 브라우저 저장값으로 세지 않는다', () => {
  const page = readFileSync(new URL('../app/my/page.tsx', import.meta.url), 'utf8')
  assert.equal(/localStorage\.getItem/.test(page), false)
  assert.ok(page.includes('/api/me/usage'))
})

console.log(`my-usage: ${count} checks passed`)
