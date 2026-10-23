import assert from 'node:assert/strict'
import { extractAccessTokenFromCookieValue, isPlausibleUnexpiredJwt, hasPlausibleSupabaseSession } from '../app/lib/supabase-cookie-shape.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const NOW = 1_800_000_000
const jwt = (payload, header = { alg: 'HS256', typ: 'JWT' }) => `${b64u(header)}.${b64u(payload)}.c2lnbmF0dXJl`
const good = jwt({ sub: 'u1', exp: NOW + 3600 })
const expired = jwt({ sub: 'u1', exp: NOW - 1 })

check('형식 맞고 만료 전 JWT 는 통과', () => assert.equal(isPlausibleUnexpiredJwt(good, NOW), true))
check('만료 · exp 없음 · alg none · 조각 수 · 문자 위반은 거부', () => {
  assert.equal(isPlausibleUnexpiredJwt(expired, NOW), false)
  assert.equal(isPlausibleUnexpiredJwt(jwt({ sub: 'u1' }), NOW), false)
  assert.equal(isPlausibleUnexpiredJwt(jwt({ exp: NOW + 10 }, { alg: 'none' }), NOW), false)
  for (const t of ['1', 'a.b', 'a.b.c.d', 'a..c', `${good}=`, 'x.y.z', '', null]) assert.equal(isPlausibleUnexpiredJwt(t, NOW), false, String(t))
})
check('쿠키 해석: base64- · URL 인코딩 JSON · 배열 · currentSession', () => {
  const obj = JSON.stringify({ access_token: good, refresh_token: 'r' })
  assert.equal(extractAccessTokenFromCookieValue('base64-' + Buffer.from(obj).toString('base64url')), good)
  assert.equal(extractAccessTokenFromCookieValue('base64-' + Buffer.from(obj).toString('base64')), good)
  assert.equal(extractAccessTokenFromCookieValue(encodeURIComponent(obj)), good)
  assert.equal(extractAccessTokenFromCookieValue(JSON.stringify([good, 'r'])), good)
  assert.equal(extractAccessTokenFromCookieValue(JSON.stringify({ currentSession: { access_token: good } })), good)
  assert.equal(extractAccessTokenFromCookieValue('1'), null)
  assert.equal(extractAccessTokenFromCookieValue('base64-!!!'), null)
})
check('미들웨어 판정: sb-아무거나-auth-token=1 은 세션 아님', () => {
  assert.equal(hasPlausibleSupabaseSession([{ name: 'sb-x-auth-token', value: '1' }], NOW), false)
  assert.equal(hasPlausibleSupabaseSession([{ name: 'sb-x-auth-token', value: JSON.stringify({ access_token: 'abc' }) }], NOW), false)
  assert.equal(hasPlausibleSupabaseSession([{ name: 'sb-x-auth-token', value: JSON.stringify({ access_token: expired }) }], NOW), false)
  assert.equal(hasPlausibleSupabaseSession([{ name: 'other', value: JSON.stringify({ access_token: good }) }], NOW), false)
  assert.equal(hasPlausibleSupabaseSession([{ name: 'sb-x-auth-token', value: 'base64-' + Buffer.from(JSON.stringify({ access_token: good })).toString('base64url') }], NOW), true)
})
console.log(`${count} checks passed`)
