import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const R = (p) => readFileSync(join(decodeURIComponent(ROOT), p), 'utf8')
const NAMES = ['baemin-health', 'manual-fetch', 'queue-cleanup', 'queue-status']

check('/api/me/** 4개는 requireUser + 본인 user_id 범위', () => {
  for (const n of NAMES) {
    const s = R(`app/api/me/${n}/route.ts`)
    assert.match(s, /requireUser\(\)/, n)
    assert.match(s, /auth\.userId/, n)
  }
})
check('/api/admin/** 4개는 requireAdmin 을 먼저 통과해야 처리기를 부른다', () => {
  for (const n of NAMES) {
    const s = R(`app/api/admin/${n}/route.ts`)
    assert.match(s, /requireAdmin\(\)/, n)
    for (const m of s.matchAll(/export async function (GET|POST)\(req: NextRequest\) \{\n\s+const denied = await gate\(\)\n\s+if \(denied\) return denied/g)) assert.ok(m)
    const handlers = [...s.matchAll(/export async function (GET|POST)/g)].length
    const gated = [...s.matchAll(/const denied = await gate\(\)/g)].length
    assert.equal(handlers, gated, n)
  }
})
check('사장님용 queue-cleanup 은 GET 으로 큐를 지우지 않는다', () => {
  const s = R('app/api/me/queue-cleanup/route.ts')
  const get = s.slice(s.indexOf('export async function GET'))
  assert.ok(!/POST\(/.test(get))
  assert.match(get, /405/)
})
check('화면 코드(app/ 의 tsx)에 옛 /api/admin/ 4개 호출이 없다', () => {
  const hits = []
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p); continue }
      if (!/\.(tsx|ts)$/.test(f) || p.includes(join('app', 'api'))) continue
      const s = readFileSync(p, 'utf8')
      for (const n of NAMES) if (s.includes(`/api/admin/${n}`)) hits.push(`${p}:${n}`)
    }
  }
  walk(join(decodeURIComponent(ROOT), 'app'))
  assert.deepEqual(hits, [])
  assert.match(R('app/review-admin/baemin/page.tsx'), /\/api\/me\/baemin-health/)
})
console.log(`${count} checks passed`)
