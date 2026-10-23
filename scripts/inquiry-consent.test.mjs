import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { hasPrivacyConsent } from '../app/lib/inquiry-consent.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }
check('불리언 true 만 동의', () => {
  assert.equal(hasPrivacyConsent(true), true)
  for (const v of [undefined, null, false, 'true', 1, 'on', {}, []]) assert.equal(hasPrivacyConsent(v), false, String(v))
})
check('API 가 저장 전에 동의를 검사하고 400 을 돌려준다', () => {
  const src = readFileSync(new URL('../app/api/inquiry/route.ts', import.meta.url), 'utf8')
  const iCheck = src.indexOf('hasPrivacyConsent(privacyConsent)')
  const iInsert = src.indexOf(".from('inquiries')\n") >= 0 ? src.indexOf(".from('inquiries')") : src.indexOf(".insert(insert)")
  assert.ok(iCheck > 0 && iInsert > iCheck, 'check before insert')
  assert.match(src.slice(iCheck, iCheck + 200), /status: 400/)
})
check('문의 화면이 privacyConsent 를 보낸다', () => {
  const src = readFileSync(new URL('../app/inquiry/page.tsx', import.meta.url), 'utf8')
  assert.match(src, /privacyConsent: agreed === true/)
})
console.log(`${count} checks passed`)
