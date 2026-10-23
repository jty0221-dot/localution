import assert from 'node:assert/strict'
import { safeReturnTo } from '../app/lib/safe-return-to.ts'

const O = 'https://www.localution.co.kr'
const F = '/fallback'
let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

check('같은 출처 경로는 통과 (쿼리 · 해시 유지)', () => {
  assert.equal(safeReturnTo('/settings?tab=plan&billing=ok#x', O, F), '/settings?tab=plan&billing=ok#x')
})
check('절대 URL · 프로토콜 상대 · 백슬래시 차단', () => {
  for (const v of ['https://evil.com', '//evil.com', String.raw`/\evil.com`, String.raw`\\evil.com`, String.raw`/\/evil.com`, 'javascript:alert(1)']) assert.equal(safeReturnTo(v, O, F), F, v)
})
check('제어문자 우회 차단', () => {
  for (const v of ['/\t/evil.com', '/\n/evil.com', '/\r\n/evil.com', '/\u0000/evil.com']) assert.equal(safeReturnTo(v, O, F), F, JSON.stringify(v))
})
check('비었거나 null 이면 기본값', () => {
  assert.equal(safeReturnTo('', O, F), F); assert.equal(safeReturnTo(null, O, F), F); assert.equal(safeReturnTo(undefined, O, F), F)
})
check('상대경로(슬래시 없음) 차단', () => {
  assert.equal(safeReturnTo('evil.com', O, F), F)
})
console.log(`${count} checks passed`)
