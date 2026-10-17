import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../app/lib/campaign-url.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const module = { exports: {} }
new Function('exports', 'module', compiled)(module.exports, module)
const { buildCampaignUrl } = module.exports
const base = { url: 'https://example.com/menu', source: 'instagram', medium: 'social', campaign: 'spring', content: '', term: '' }
const build = changes => buildCampaignUrl({ ...base, ...changes })
const parsed = changes => new URL(build(changes).url)
test('three required tags', () => { const result = build({}); assert.equal(result.valid, true); assert.equal(new URL(result.url).searchParams.get('utm_campaign'), 'spring') })
test('Korean campaign content roundtrip', () => { const url = parsed({ campaign: '봄 신메뉴', content: '프로필' }); assert.equal(url.searchParams.get('utm_campaign'), '봄 신메뉴'); assert.equal(url.searchParams.get('utm_content'), '프로필') })
test('preserve query and hash', () => { const url = parsed({ url: 'https://example.com/?menu=점심&x=1&x=2#order' }); assert.equal(url.hash, '#order'); assert.equal(url.searchParams.get('menu'), '점심'); assert.deepEqual(url.searchParams.getAll('x'), ['1', '2']) })
test('replace all case insensitive UTM and duplicates', () => { const url = parsed({ url: 'https://example.com/?UTM_Source=old&utm_source=other&utm_id=123&UtM_custom=x&utm_content=old' }); assert.deepEqual([...url.searchParams.keys()].sort(), ['utm_campaign', 'utm_medium', 'utm_source']); assert.equal(url.searchParams.getAll('utm_source').length, 1) })
test('keep auto tag and warn', () => { const result = build({ url: 'https://example.com/?gclid=abc&foo=bar' }); assert.equal(result.hasAutoTag, true); assert.equal(new URL(result.url).searchParams.get('gclid'), 'abc') })
test('source medium normalize only', () => { const url = parsed({ source: ' Instagram ', medium: 'SOCIAL', campaign: 'SpringSALE' }); assert.equal(url.searchParams.get('utm_source'), 'instagram'); assert.equal(url.searchParams.get('utm_medium'), 'social'); assert.equal(url.searchParams.get('utm_campaign'), 'SpringSALE') })
test('blank required', () => { for (const key of ['url', 'source', 'medium', 'campaign']) assert.equal(build({ [key]: '  ' }).valid, false) })
test('malicious schemes rejected', () => { for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///tmp/a', 'ftp://example.com']) assert.equal(build({ url }).valid, false) })
test('credentials rejected', () => { for (const url of ['https://user:pass@example.com', 'https://user@example.com']) assert.equal(build({ url }).valid, false) })
test('relative or malformed rejected', () => { for (const url of ['/menu', '//example.com', 'https://', 'https:example.com', 'https:///bad.com', 'https://exa mple.com', 'https://example.com/%zz']) assert.equal(build({ url }).valid, false, url) })
test('oversized input rejected', () => { assert.equal(build({ campaign: 'x'.repeat(201) }).valid, false); assert.equal(build({ url: 'https://example.com/' + 'x'.repeat(4096) }).valid, false) })
test('empty optional tags omitted', () => { const url = parsed({ content: '  ', term: '' }); assert.equal(url.searchParams.has('utm_content'), false); assert.equal(url.searchParams.has('utm_term'), false) })
test('optional special characters encoded safely', () => { const url = parsed({ content: 'a&b=c#d', term: '커피 + 빵' }); assert.equal(url.searchParams.get('utm_content'), 'a&b=c#d'); assert.equal(url.searchParams.get('utm_term'), '커피 + 빵') })
test('control characters rejected', () => { assert.equal(build({ campaign: 'a\nb' }).valid, false); assert.equal(build({ url: 'https://example.com/\tfoo' }).valid, false) })
test('http accepted', () => assert.equal(build({ url: 'http://example.com' }).valid, true))
test('wrong runtime input fails closed', () => { assert.equal(buildCampaignUrl(null).valid, false); assert.equal(build({ source: 12 }).valid, false) })
