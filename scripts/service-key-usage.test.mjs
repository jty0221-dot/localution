import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }
const R = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

check('request-tester: 서비스 키 직접 헤더 · 관리 API · 실행 중 DDL 없음', () => {
  const s = R('app/api/threads/request-tester/route.ts')
  assert.ok(!/Bearer \$\{/.test(s))
  assert.ok(!s.includes('api.supabase.com'))
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY/.test(s))
  assert.ok(!/fetch\(/.test(s))
  assert.match(s, /createServiceClient\(\)/)
  assert.match(s, /status: 503/)
})
check('테이블은 마이그레이션 파일로', () => {
  assert.match(R('migrations/threads_tester_requests.sql'), /CREATE TABLE IF NOT EXISTS public\.threads_tester_requests/)
})
check('seed_app_updates: supabase-js 클라이언트 사용 · 직접 Bearer 없음', () => {
  const s = R('scripts/seed_app_updates.js')
  assert.ok(!/Bearer \$\{SERVICE_KEY\}/.test(s))
  assert.ok(!/rest\/v1/.test(s))
  assert.match(s, /require\('@supabase\/supabase-js'\)/)
})
console.log(`${count} checks passed`)
