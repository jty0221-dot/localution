// app/lib/safe-fetch.ts
// ============================================================
// 서버에서 바깥 URL 을 읽을 때 쓰는 안전한 fetch (SSRF 방지 · SEC-L12)
//   · http(s) 만 · 기본 포트만 · 허용 호스트 목록만
//   · DNS 해석 결과 IP 가 사설 · 루프백 · 링크로컬 · 메타데이터 등이면 거부
//     (연결 시점의 lookup 에서 검사하므로 DNS 재바인딩도 막는다)
//   · 리다이렉트는 따라가지 않는다 (3xx 는 실패로 돌려준다)
//   · 응답 크기 · 시간 상한
// ============================================================
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

export type SafeFetchResult =
  | { ok: true; status: number; text: string }
  | { ok: false; error: 'invalid_url' | 'host_not_allowed' | 'blocked_ip' | 'redirect' | 'http_error' | 'too_large' | 'timeout' | 'network'; status?: number }

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, p) => ((acc << 8) + Number(p)) >>> 0, 0)
}

function inV4(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],        // 이 네트워크
  ['10.0.0.0', 8],       // 사설
  ['100.64.0.0', 10],    // CGNAT
  ['127.0.0.0', 8],      // 루프백
  ['169.254.0.0', 16],   // 링크로컬 · 클라우드 메타데이터(169.254.169.254)
  ['172.16.0.0', 12],    // 사설
  ['192.0.0.0', 24],     // IETF 예약
  ['192.0.2.0', 24],     // 문서용
  ['192.88.99.0', 24],   // 6to4 릴레이
  ['192.168.0.0', 16],   // 사설
  ['198.18.0.0', 15],    // 벤치마크
  ['198.51.100.0', 24],  // 문서용
  ['203.0.113.0', 24],   // 문서용
  ['224.0.0.0', 4],      // 멀티캐스트
  ['240.0.0.0', 4],      // 예약 · 브로드캐스트
]

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase()
  const zone = s.indexOf('%')
  if (zone >= 0) s = s.slice(0, zone)
  // 끝에 IPv4 가 붙은 꼴(::ffff:1.2.3.4) → 16진 두 묶음으로
  const v4m = s.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (v4m) {
    if (net.isIPv4(v4m[1]) === false) return null
    const n = ipv4ToInt(v4m[1])
    s = s.slice(0, -v4m[1].length) + ((n >>> 16) & 0xffff).toString(16) + ':' + (n & 0xffff).toString(16)
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0
  if (fill < 0) return null
  const parts = [...head, ...Array(fill).fill('0'), ...tail]
  if (parts.length !== 8) return null
  const out = parts.map(p => parseInt(p || '0', 16))
  return out.some(n => Number.isNaN(n) || n < 0 || n > 0xffff) ? null : out
}

/** 서버가 연결하면 안 되는 IP 인지 (모르는 형식도 막는다) */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return BLOCKED_V4.some(([base, bits]) => inV4(ip, base, bits))
  if (!net.isIPv6(ip)) return true
  const w = expandV6(ip)
  if (!w) return true
  const allZeroPrefix = (n: number) => w.slice(0, n).every(x => x === 0)
  const embeddedV4 = (hi: number, lo: number) => `${hi >>> 8}.${hi & 0xff}.${lo >>> 8}.${lo & 0xff}`
  if (allZeroPrefix(8)) return true                                  // ::
  if (allZeroPrefix(7) && w[7] === 1) return true                    // ::1
  if (allZeroPrefix(5) && w[5] === 0xffff) return isBlockedIp(embeddedV4(w[6], w[7])) // ::ffff:a.b.c.d
  if (allZeroPrefix(6)) return true                                  // ::a.b.c.d (폐기된 호환 주소)
  if (w[0] === 0x64 && w[1] === 0xff9b) return isBlockedIp(embeddedV4(w[6], w[7]))   // NAT64
  if (w[0] === 0x2002) return isBlockedIp(embeddedV4(w[1], w[2]))    // 6to4
  if ((w[0] & 0xfe00) === 0xfc00) return true                        // fc00::/7 고유 로컬
  if ((w[0] & 0xffc0) === 0xfe80) return true                        // fe80::/10 링크로컬
  if ((w[0] & 0xffc0) === 0xfec0) return true                        // fec0::/10 사이트로컬(폐기)
  if ((w[0] & 0xff00) === 0xff00) return true                        // 멀티캐스트
  if (w[0] === 0x2001 && w[1] === 0x0db8) return true                // 문서용
  if (w[0] === 0x0100 && w[1] === 0 && w[2] === 0 && w[3] === 0) return true // 100::/64 폐기
  return false
}

/** URL 이 허용 목록 안의 http(s) 기본 포트 주소인지. 통과하면 URL 객체 */
export function checkAllowedUrl(raw: string, allowedHosts: readonly string[]): { ok: true; url: URL } | { ok: false; error: 'invalid_url' | 'host_not_allowed' } {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return { ok: false, error: 'invalid_url' }
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return { ok: false, error: 'invalid_url' }
  let url: URL
  try { url = new URL(raw) } catch { return { ok: false, error: 'invalid_url' } }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'invalid_url' }
  if (url.username || url.password) return { ok: false, error: 'invalid_url' }
  if (url.port !== '') return { ok: false, error: 'host_not_allowed' }
  const host = url.hostname.toLowerCase()
  if (!allowedHosts.map(h => h.toLowerCase()).includes(host)) return { ok: false, error: 'host_not_allowed' }
  return { ok: true, url }
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void

/** 해석한 IP 를 모두 검사한 뒤에만 연결을 허락하는 lookup */
export function guardedLookup(hostname: string, options: dns.LookupOptions | number | LookupCb, cb?: LookupCb): void {
  const callback = (typeof options === 'function' ? options : cb) as LookupCb
  const opts: dns.LookupOptions = typeof options === 'object' && options ? options : {}
  dns.lookup(hostname, { ...opts, all: true }, (err, addrs) => {
    if (err) return callback(err, '')
    const list = (addrs as dns.LookupAddress[]) || []
    if (list.length === 0 || list.some(a => isBlockedIp(a.address))) {
      const e: NodeJS.ErrnoException = new Error('blocked_ip')
      e.code = 'EBLOCKEDIP'
      return callback(e, '')
    }
    if (opts.all) return callback(null, list)
    return callback(null, list[0].address, list[0].family)
  })
}

export async function safeFetchText(
  raw: string,
  opts: {
    allowedHosts: readonly string[]
    maxBytes?: number
    timeoutMs?: number
    headers?: Record<string, string>
    /** 테스트 전용: 로컬 서버로 리다이렉트 · 크기 상한을 확인할 때만 바꾼다. 운영 호출처는 넘기지 않는다 */
    unsafeTestLookup?: typeof guardedLookup
  },
): Promise<SafeFetchResult> {
  const checked = checkAllowedUrl(raw, opts.allowedHosts)
  if (!checked.ok) return { ok: false, error: checked.error }
  const url = checked.url
  const maxBytes = opts.maxBytes ?? 1_000_000
  const timeoutMs = opts.timeoutMs ?? 8000
  const mod = url.protocol === 'https:' ? https : http

  return new Promise<SafeFetchResult>(resolve => {
    let settled = false
    const done = (r: SafeFetchResult) => { if (!settled) { settled = true; clearTimeout(timer); resolve(r) } }
    const req = mod.request(url, {
      method: 'GET',
      headers: { ...(opts.headers || {}), 'Accept-Encoding': 'identity' },
      lookup: (opts.unsafeTestLookup || guardedLookup) as unknown as typeof dns.lookup,
      agent: false,
    }, res => {
      const status = res.statusCode || 0
      if (status >= 300 && status < 400) { res.destroy(); return done({ ok: false, error: 'redirect', status }) }
      if (status < 200 || status >= 300) { res.destroy(); return done({ ok: false, error: 'http_error', status }) }
      const declared = Number(res.headers['content-length'] || 0)
      if (declared > maxBytes) { res.destroy(); return done({ ok: false, error: 'too_large', status }) }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (c: Buffer) => {
        size += c.length
        if (size > maxBytes) { res.destroy(); req.destroy(); return done({ ok: false, error: 'too_large', status }) }
        chunks.push(c)
      })
      res.on('end', () => done({ ok: true, status, text: Buffer.concat(chunks).toString('utf8') }))
      res.on('error', () => done({ ok: false, error: 'network', status }))
    })
    const timer = setTimeout(() => { req.destroy(); done({ ok: false, error: 'timeout' }) }, timeoutMs)
    req.on('error', (e: NodeJS.ErrnoException) => done({ ok: false, error: e?.code === 'EBLOCKEDIP' || e?.message === 'blocked_ip' ? 'blocked_ip' : 'network' }))
    req.end()
  })
}
