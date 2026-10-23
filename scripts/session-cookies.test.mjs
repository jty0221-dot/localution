import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextResponse } from 'next/server.js'
import { sessionCookieSetOpts, sessionCookieClearHeaders, appendSessionCookieClears, appendHostOnlyDuplicateClears } from '../app/lib/session-cookies.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }
const PROD = 'https://www.localution.co.kr/api/me'
const PREVIEW = 'https://localution-git-x.vercel.app/api/me'

check('재현 근거: Next 응답 쿠키는 같은 이름을 두 번 set 하면 하나만 남는다', () => {
  const res = NextResponse.json({})
  res.cookies.set('localution_user', '', { path: '/', maxAge: 0, domain: '.localution.co.kr' })
  res.cookies.set('localution_user', '', { path: '/', maxAge: 0 })
  const all = res.headers.getSetCookie().filter(h => h.startsWith('localution_user='))
  assert.equal(all.length, 1)
  assert.ok(!/Domain=/i.test(all[0]), '마지막(호스트 전용)만 남음 → Domain 쿠키는 안 지워진다')
})
check('발급 옵션: 프로덕션은 Domain · httpOnly · secure · lax · 30일 · path=/', () => {
  const o = sessionCookieSetOpts(PROD)
  assert.deepEqual({ ...o }, { secure: true, sameSite: 'lax', maxAge: 2592000, path: '/', domain: '.localution.co.kr', httpOnly: true })
  assert.equal(sessionCookieSetOpts(PREVIEW).domain, undefined)
  assert.equal(sessionCookieSetOpts(PROD, 3600).maxAge, 3600)
})
check('지우기: 프로덕션은 이름마다 호스트 전용 + Domain 두 벌 · 프리뷰는 한 벌', () => {
  const p = sessionCookieClearHeaders(PROD, ['localution_user'])
  assert.equal(p.length, 2)
  assert.ok(p.some(h => !/Domain=/.test(h)) && p.some(h => /Domain=\.localution\.co\.kr/.test(h)))
  for (const h of p) assert.match(h, /^localution_user=; Path=\/; Max-Age=0; Expires=Thu, 01 Jan 1970/)
  assert.equal(sessionCookieClearHeaders(PREVIEW, ['localution_user']).length, 1)
})
check('cookies.set 뒤에 붙인 두 벌 지우기가 응답에 그대로 남는다', () => {
  const res = NextResponse.json({})
  res.cookies.set('other', '1', { path: '/' })
  appendSessionCookieClears(res.headers, PROD)
  const sc = res.headers.getSetCookie()
  assert.equal(sc.filter(h => h.startsWith('localution_user=')).length, 2)
  assert.equal(sc.filter(h => h.startsWith('localution_session=')).length, 2)
  assert.equal(sc.filter(h => h.startsWith('other=')).length, 1)
})
check('갱신: Domain 본 발급 + 호스트 전용 옛 쿠키만 지움 (프리뷰는 지우지 않음)', () => {
  const res = NextResponse.json({})
  res.cookies.set('localution_user', 'v', sessionCookieSetOpts(PROD))
  appendHostOnlyDuplicateClears(res.headers, PROD, ['localution_user'])
  const sc = res.headers.getSetCookie().filter(h => h.startsWith('localution_user='))
  assert.equal(sc.length, 2)
  assert.ok(sc.some(h => h.startsWith('localution_user=v') && /Domain=\.localution\.co\.kr/i.test(h)))
  assert.ok(sc.some(h => h.startsWith('localution_user=;') && !/Domain=/.test(h)))
  const r2 = NextResponse.json({})
  r2.cookies.set('localution_user', 'v', sessionCookieSetOpts(PREVIEW))
  appendHostOnlyDuplicateClears(r2.headers, PREVIEW, ['localution_user'])
  assert.equal(r2.headers.getSetCookie().length, 1)
})
check('세션 쿠키를 심는 곳에 Domain 없는 고정 옵션이 남지 않음', () => {
  for (const f of ['app/api/me/route.ts', 'app/api/admin/impersonate/route.ts', 'app/api/auth/logout/route.ts', 'middleware.ts']) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8')
    assert.ok(!/cookies\.(set|delete)\('localution_(user|session)'[^)]*\{\s*\n?\s*httpOnly/.test(src), f)
    assert.ok(!/cookies\.delete\('localution_(user|session)'\)/.test(src), f)
  }
})
check('cookies() 를 쓰는 처리기(임시 로그인)는 Set-Cookie 원문을 덧붙이지 않는다 (Next 가 같은 이름을 덮어씀)', () => {
  const src = readFileSync(new URL('../app/api/admin/impersonate/route.ts', import.meta.url), 'utf8')
  assert.ok(!/append(HostOnlyDuplicate|Session)Cookie/.test(src))
  assert.ok(!/headers\.append\('Set-Cookie'/.test(src))
})
console.log(`${count} checks passed`)
