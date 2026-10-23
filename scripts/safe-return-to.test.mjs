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
check('SEC-L23 정규화 뒤 // 로 바뀌는 꼴 차단', () => {
  for (const v of ['/..//evil.com', '/.//evil.com', '/%2e%2e//evil.com', '/%2E%2E//evil.com', '/x/../..//evil.com', '/a/b/../../..//evil.com', '/././/evil.com']) {
    assert.equal(safeReturnTo(v, O, F), F, v)
  }
})
check('SEC-L23 퍼센트 인코딩 슬래시 · 백슬래시 차단', () => {
  for (const v of ['/%2F%2Fevil.com', '/%2f%2fevil.com', '/%5Cevil.com', '/%5cevil.com', '/%2F%5Cevil.com', '/..%2F%2Fevil.com', '/x/..%5C..%5Cevil.com']) {
    const r = safeReturnTo(v, O, F)
    assert.equal(r, F, v)
  }
})
check('SEC-L23 대소문자 javascript: · data: · 공백 접두 차단', () => {
  for (const v of ['JavaScript:alert(1)', 'JAVASCRIPT:alert(1)', ' javascript:alert(1)', 'data:text/html,x', '\tjavascript:alert(1)', '%2F%2Fevil.com']) {
    assert.equal(safeReturnTo(v, O, F), F, JSON.stringify(v))
  }
})
check('SEC-L23 제어문자 + 점 경로 섞은 꼴 차단', () => {
  for (const v of ['/\t..//evil.com', '/..\t//evil.com', '/.\n.//evil.com', '/..//\nevil.com']) assert.equal(safeReturnTo(v, O, F), F, JSON.stringify(v))
})
check('SEC-L23 결과를 다시 new URL 로 풀어도 같은 출처', () => {
  const inputs = ['/settings', '/a/../b', '/a/./b?x=1#h', '/..//evil.com', '/%2e%2e//evil.com', '/%2F%2Fevil.com', '/dashboard?next=%2F%2Fevil.com']
  for (const v of inputs) {
    const r = safeReturnTo(v, O, F)
    assert.equal(new URL(r, O).origin, O, `${v} -> ${r}`)
  }
})
check('정상 경로 정규화는 유지', () => {
  assert.equal(safeReturnTo('/a/../b', O, F), '/b')
  assert.equal(safeReturnTo('/dashboard?next=%2F%2Fevil.com', O, F), '/dashboard?next=%2F%2Fevil.com')
})
console.log(`${count} checks passed`)
