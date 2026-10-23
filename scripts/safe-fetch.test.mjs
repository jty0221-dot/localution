import assert from 'node:assert/strict'
import http from 'node:http'
import dns from 'node:dns'
import { isBlockedIp, checkAllowedUrl, safeFetchText, guardedLookup } from '../app/lib/safe-fetch.ts'
import { AFFILIATE_PREVIEW_HOSTS, AFFILIATE_PRODUCTS } from '../app/lib/affiliate-config.ts'

let count = 0
async function check(name, run) { await run(); count++; console.log('PASS', name) }

await check('사설 · 루프백 · 링크로컬 · 메타데이터 IPv4 차단', () => {
  for (const ip of ['127.0.0.1', '127.1.2.3', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1']) assert.equal(isBlockedIp(ip), true, ip)
})
await check('IPv6 루프백 · ULA · 링크로컬 · 매핑 · NAT64 · 6to4 차단', () => {
  for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'fe80::1%eth0', '::ffff:127.0.0.1', '::ffff:169.254.169.254', '::ffff:7f00:1', '64:ff9b::a9fe:a9fe', '2002:a9fe:a9fe::1', 'ff02::1', 'fd00:ec2::254', '2001:0:4136:e378::1', '64:ff9b:1::a']) assert.equal(isBlockedIp(ip), true, ip)
})
await check('공인 IP 는 통과', () => {
  for (const ip of ['223.130.200.104', '8.8.8.8', '172.32.0.1', '2404:6800:4004:80c::200e', '::ffff:8.8.8.8']) assert.equal(isBlockedIp(ip), false, ip)
})
await check('URL 허용 검사: 스킴 · 호스트 · 포트 · 계정정보 · 제어문자', () => {
  const H = AFFILIATE_PREVIEW_HOSTS
  assert.equal(checkAllowedUrl('https://smartstore.naver.com/a/products/1', H).ok, true)
  for (const u of ['ftp://smartstore.naver.com/', 'file:///etc/passwd', 'gopher://naver.me/', 'https://evil.com/', 'https://smartstore.naver.com.evil.com/', 'https://smartstore.naver.com:8080/', 'https://user:pw@smartstore.naver.com/', 'https://169.254.169.254/', 'http://localhost/', 'https://smartstore.naver.com\@evil.com/', 'https://smart\tstore.naver.com/', 'javascript:alert(1)'])
    assert.equal(checkAllowedUrl(u, H).ok, false, u)
})
await check('설정의 미리보기 출처 호스트가 모두 허용 목록 안', () => {
  for (const p of AFFILIATE_PRODUCTS) {
    const host = new URL(p.previewSourceUrl || p.url).hostname
    assert.ok(AFFILIATE_PREVIEW_HOSTS.includes(host), host)
  }
})
await check('DNS 해석이 사설 IP 면 연결 전 거부 (localhost)', async () => {
  const r = await safeFetchText('http://localhost/', { allowedHosts: ['localhost'] })
  assert.deepEqual(r, { ok: false, error: 'blocked_ip' })
})
await check('guardedLookup 은 공인 IP 만 돌려준다', async () => {
  const err = await new Promise(res => guardedLookup('localhost', {}, (e) => res(e)))
  assert.equal(err?.code, 'EBLOCKEDIP')
})

// 로컬 서버(포트 80)로 리다이렉트 · 크기 · 시간 상한 확인 — 테스트 전용 lookup 사용
const server = http.createServer((req, res) => {
  if (req.url === '/redirect') { res.writeHead(302, { Location: 'http://169.254.169.254/' }); return res.end() }
  if (req.url === '/big') { res.writeHead(200); res.write(Buffer.alloc(600_000)); res.write(Buffer.alloc(600_000)); return res.end() }
  if (req.url === '/slow') { setTimeout(() => { try { res.end('late') } catch {} }, 1500); return }
  res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>ok</title>')
})
let listening = true
await new Promise(res => server.listen(80, '127.0.0.1', res).on('error', () => { listening = false; res() }))
if (listening) {
  const lookup = (h, o, cb) => dns.lookup('127.0.0.1', o, cb)
  const opts = { allowedHosts: ['test.local'], unsafeTestLookup: lookup }
  await check('정상 응답은 본문 반환', async () => {
    const r = await safeFetchText('http://test.local/', opts); assert.equal(r.ok, true); assert.match(r.text, /ok/)
  })
  await check('리다이렉트는 따라가지 않는다', async () => {
    const r = await safeFetchText('http://test.local/redirect', opts); assert.deepEqual(r, { ok: false, error: 'redirect', status: 302 })
  })
  await check('응답 크기 상한 1MB', async () => {
    const r = await safeFetchText('http://test.local/big', { ...opts, maxBytes: 1_000_000 }); assert.equal(r.ok, false); assert.equal(r.error, 'too_large')
  })
  await check('시간 상한', async () => {
    const r = await safeFetchText('http://test.local/slow', { ...opts, timeoutMs: 300 }); assert.deepEqual(r, { ok: false, error: 'timeout' })
  })
  server.close()
} else {
  console.log('SKIP 포트 80 을 열 수 없어 리다이렉트 · 크기 · 시간 상한 확인 생략')
}
console.log(`${count} checks passed`)
process.exit(0)
