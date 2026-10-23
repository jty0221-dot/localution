import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { verifyCookieEdge, decideAdminGate } from '../app/lib/cookieSigningEdge.ts'
import { isProductionRuntime } from '../app/lib/runtime-env.ts'

// cookieSigning.ts signCookie() 와 같은 형식으로 서명 (node crypto)
const SECRET = 'test-secret-0123456789abcdef'
function sign(user, secret = SECRET) {
  const b64 = Buffer.from(JSON.stringify({ ...user, iat: 1 }), 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}.${sig}`
}
const isAdmin = (e) => e === 'admin@example.com'

let count = 0
async function check(name, run) { await run(); count++; console.log('PASS', name) }

await check('정상 서명 쿠키 검증 (한글 이름 포함)', async () => {
  const u = await verifyCookieEdge(sign({ id: 'u1', email: 'admin@example.com', name: '하랑' }), SECRET)
  assert.equal(u.id, 'u1'); assert.equal(u.email, 'admin@example.com'); assert.equal(u.name, '하랑')
})
await check('URL 인코딩된 쿠키도 검증', async () => {
  const u = await verifyCookieEdge(encodeURIComponent(sign({ id: 'u2' })), SECRET)
  assert.equal(u.id, 'u2')
})
await check('비밀값이 다르면 실패', async () => {
  assert.equal(await verifyCookieEdge(sign({ id: 'u1' }, 'other-secret-0123456789'), SECRET), null)
})
await check('payload 변조 시 실패', async () => {
  const [, sig] = sign({ id: 'u1', email: 'user@example.com' }).split('.')
  const forged = Buffer.from(JSON.stringify({ id: 'u1', email: 'admin@example.com' })).toString('base64url')
  assert.equal(await verifyCookieEdge(`${forged}.${sig}`, SECRET), null)
})
await check('옛 형식 JSON 쿠키는 실패', async () => {
  assert.equal(await verifyCookieEdge(encodeURIComponent(JSON.stringify({ id: 'u1', email: 'admin@example.com' })), SECRET), null)
})
await check('비밀값 없음 · 짧음 · 빈 쿠키는 실패', async () => {
  assert.equal(await verifyCookieEdge(sign({ id: 'u1' }), undefined), null)
  assert.equal(await verifyCookieEdge(sign({ id: 'u1' }), 'short'), null)
  assert.equal(await verifyCookieEdge('', SECRET), null)
})
await check('id 없는 payload 는 실패', async () => {
  assert.equal(await verifyCookieEdge(sign({ email: 'admin@example.com' }), SECRET), null)
})
await check('관리자 판정 표', async () => {
  assert.equal(decideAdminGate(false, null, isAdmin), 'defer')
  assert.equal(decideAdminGate(true, null, isAdmin), 'deny')
  assert.equal(decideAdminGate(true, { id: 'a' }, isAdmin), 'defer')
  assert.equal(decideAdminGate(true, { id: 'a', email: ' Admin@Example.com ' }, isAdmin), 'allow')
  assert.equal(decideAdminGate(true, { id: 'a', email: 'user@example.com' }, isAdmin), 'deny')
})
await check('운영 판정', async () => {
  assert.equal(isProductionRuntime({ NODE_ENV: 'production' }), true)
  assert.equal(isProductionRuntime({ NODE_ENV: 'development', VERCEL_ENV: 'production' }), true)
  assert.equal(isProductionRuntime({ NODE_ENV: 'development', VERCEL_ENV: 'preview' }), false)
  assert.equal(isProductionRuntime({}), false)
})
console.log(`${count} checks passed`)
