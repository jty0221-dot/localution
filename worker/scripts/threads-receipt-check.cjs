const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/adapters/threads.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

async function run(mode) {
  const updates = [], calls = [], logs = []
  const post = { id: 'post-test', user_id: 'user-test', status: 'publishing', container_id: 'container-test', media_type: 'TEXT', text_content: 'test', thread_replies: [{ text_content: 'reply' }] }
  if (mode === 'already') post.status = 'published'
  if (mode === 'existing-id') post.threads_post_id = 'existing-provider-id'
  const svc = { from() {
    let update
    const q = {
      select() { return q }, eq() { return q },
      update(value) { update = value; updates.push(value); return q },
      async maybeSingle() {
        if (!update) return { data: post, error: null }
        if (mode === 'throw') throw new Error('database transport failure')
        return { data: mode === 'zero' ? null : { id: post.id }, error: mode === 'error' ? { message: 'db failed' } : null }
      },
      then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject) },
    }
    return q
  } }
  const log = Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (...args) => {
    logs.push({ level, args })
    if (mode === 'after-save-throw' && level === 'info' && String(args[1]).includes('published successfully')) throw new Error('logger failure')
  }]))
  const exports = {}
  const context = { exports, URLSearchParams, Date, setTimeout,
    require(name) {
      if (name === '../lib/supabase') return { getServiceClient: () => svc }
      if (name === '../lib/threads-token') return { refreshThreadsTokenIfNeeded: async () => {}, loadThreadsToken: async () => ({ access_token: 'test', threads_user_id: 'test' }) }
      throw new Error('unexpected import ' + name)
    },
    async fetch(url, options) {
      calls.push({ url, method: options?.method || 'GET' })
      if (url.includes('?fields=status')) return { json: async () => ({ status: 'FINISHED' }) }
      if (url.endsWith('/threads_publish')) return { json: async () => mode === 'provider-failed' ? { error: { message: 'rejected' } } : { id: 'provider-id' } }
      return { json: async () => ({ id: 'reply-container' }) }
    },
  }
  vm.runInNewContext(js, context)
  const result = await exports.runThreadsPublish({ userId: 'user-test', log }, { post_id: 'post-test' })
  return { result, updates, calls, logs }
}

;(async () => {
  for (const mode of ['error', 'zero', 'throw', 'after-save-throw']) {
    const { result, updates, calls, logs } = await run(mode)
    assert.equal(result.status, 'skipped', mode)
    assert.equal(result.data.code, 'receipt_reconciliation_required', mode)
    assert.equal(result.data.threadsPostId, 'provider-id', mode)
    assert.equal(result.data.retryAllowed, false, mode)
    assert.equal(calls.filter(c => c.method === 'POST').length, 1, 'no reply or duplicate publish: ' + mode)
    assert.equal(updates.some(u => u.status === 'failed' || u.retry_count !== undefined), false, mode)
    assert.equal(logs.some(l => l.level === 'error' && l.args[0].threadId === 'provider-id'), true, mode)
    console.log('PASS', mode)
  }
  for (const mode of ['already', 'existing-id']) {
    const r = await run(mode)
    assert.equal(r.result.status, 'skipped')
    assert.equal(r.calls.length, 0)
    assert.equal(r.updates.length, 0)
    console.log('PASS', mode)
  }
  const success = await run('success')
  assert.equal(success.result.status, 'ok')
  assert.equal(success.calls.filter(c => c.method === 'POST').length, 3)
  console.log('PASS success with reply chain')
  const failed = await run('provider-failed')
  assert.equal(failed.result.status, 'failed')
  assert.equal(failed.updates.some(u => u.status === 'failed'), true)
  console.log('PASS provider rejection before receipt')
  console.log('8 actual-source checks passed; external calls and DB writes mocked')
})().catch(error => { console.error(error); process.exitCode = 1 })
