const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/adapters/threads.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

async function run(mode) {
  const updates = [], calls = [], logs = []
  const post = { id: 'post-test', user_id: 'user-test', status: 'publishing', updated_at: 'old', error_message: null, container_id: 'container-test', media_type: 'TEXT', text_content: 'test', thread_replies: [{ text_content: 'reply' }] }
  if (mode === 'already') post.status = 'published'
  if (mode === 'existing-id') post.threads_post_id = 'existing-provider-id'
  if (mode === 'other-user') post.user_id = 'other'
  if (mode === 'marker') post.error_message = 'publication_attempt_in_flight:previous'
  if (mode === 'draft') post.status = 'draft'
  const svc = { from() {
    let update, filters = []
    const q = {
      select() { return q }, eq(k,v) { filters.push(r => r[k] === v); return q }, is(k,v) { filters.push(r => r[k] === v); return q },
      update(value) { update = value; updates.push(value); return q },
      async maybeSingle() {
        if (!filters.every(f => f(post))) return {data:null,error:null}
        if (!update) return { data: {...post}, error: null }
        if (String(update.error_message || '').startsWith('publication_attempt_in_flight')) {
          if (mode === 'claim-error') return {data:null,error:{message:'claim failed'}}
          Object.assign(post,update);return {data:{id:post.id},error:null}
        }
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
      if (name === 'node:crypto') return require(name)
      if (name === '../lib/supabase') return { getServiceClient: () => svc }
      if (name === '../lib/threads-token') return { refreshThreadsTokenIfNeeded: async () => {if(mode==='token-error')throw Error('refresh failed')}, loadThreadsToken: async () => ({ access_token: 'test', threads_user_id: 'test' }) }
      throw new Error('unexpected import ' + name)
    },
    async fetch(url, options) {
      calls.push({ url, method: options?.method || 'GET' })
      if (url.endsWith('/threads_publish') && mode === 'response-lost') throw Error('response lost')
      if (url.endsWith('/threads_publish') && mode === 'json-error') return {json:async()=>{throw Error('invalid json')}}
      if (url.includes('?fields=status')) return { json: async () => ({ status: 'FINISHED' }) }
      if (url.endsWith('/threads_publish')) return { json: async () => mode === 'provider-failed' ? { error: { message: 'rejected' } } : { id: 'provider-id' } }
      return { json: async () => ({ id: 'reply-container' }) }
    },
  }
  vm.runInNewContext(js, context)
  const invoke = () => exports.runThreadsPublish({ userId: 'user-test', log }, { post_id: 'post-test' })
  const result = mode === 'concurrent' ? await Promise.all([invoke(), invoke()]) : mode === 'token-error' ? await invoke().catch(error=>({error:error.message})) : await invoke()
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
  for (const mode of ['already', 'existing-id', 'marker', 'draft', 'claim-error']) {
    const r = await run(mode)
    assert.equal(r.result.status, 'skipped')
    assert.equal(r.calls.length, 0)
    assert.equal(r.updates.length, mode === 'claim-error' ? 1 : 0)
    console.log('PASS', mode)
  }
  const success = await run('success')
  assert.equal(success.result.status, 'ok')
  assert.equal(success.calls.filter(c => c.method === 'POST').length, 3)
  console.log('PASS success with reply chain')
  for (const mode of ['provider-failed','response-lost','json-error']) {
    const r=await run(mode)
    assert.equal(r.result.status,'skipped')
    assert.equal(r.result.data.retryAllowed,false)
    assert.equal(r.result.data.externalPublished,false)
    assert.equal(r.updates.some(u=>u.status==='failed'),false)
    assert.equal(r.calls.filter(c=>c.method==='POST').length,1)
    console.log('PASS ambiguous publication',mode)
  }
  const tokenError=await run('token-error');assert.equal(tokenError.result.error,'refresh failed');assert.equal(tokenError.calls.length,0);assert.equal(tokenError.updates.length,1);assert.ok(tokenError.updates[0].error_message.startsWith('publication_attempt_in_flight')); console.log('PASS token refresh failure keeps durable claim for inspection')
  const wrong=await run('other-user');assert.equal(wrong.calls.length,0)
  const concurrent=await run('concurrent');assert.equal(concurrent.result.filter(r=>r.status==='ok').length,1);assert.equal(concurrent.calls.filter(c=>c.method==='POST').length,3);console.log('PASS concurrent execution single publication chain')
  console.log('16 actual-source checks passed; external calls and DB writes mocked')
})().catch(error => { console.error(error); process.exitCode = 1 })
