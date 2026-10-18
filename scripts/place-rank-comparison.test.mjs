import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), ts = require('typescript')
function load(name, dependencies = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(readFileSync(new URL('../app/lib/' + name + '.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('exports', 'module', 'require', code)(module.exports, module, id => { if (!(id in dependencies)) throw Error('Unexpected dependency: ' + id); return dependencies[id] })
  return module.exports
}
const core = load('rank-score-comparison')
const { compareRecordedPlaceCandidates: compare } = load('place-rank-comparison', { './rank-score-comparison': core })
const result = { rank: 1, total: 2, method: 'map_api', matchedName: '합성 A', competitors: [{ rank: 1, placeId: '1', name: '합성 A', naverScore: 100 }, { rank: 2, placeId: '2', name: '합성 B', naverScore: 50 }], errors: [], checkedAt: '2026-10-18T00:00:00Z', status: 'measured' }
const context = { keyword: '합성 검증', date: '2026-10-18' }
test('unverified caller-filled scores never become upstream observations', () => {
  const r = compare(result, context, '1', '2')
  assert.equal(r.comparability, 'not-comparable'); assert.equal(r.ordering, 'unavailable'); assert.equal(r.scoreGap, null); assert.equal(r.causalCriterionVerified, false)
})
test('failed result cannot supply measured ranks', () => {
  const r = compare({ ...result, errors: ['upstream_access_denied'] }, context, '1', '2')
  assert.equal(r.ordering, 'unavailable'); assert.match(r.reasons[0], /실측/)
})
test('absent identity does not create a competitor', () => assert.equal(compare(result, context, '1', '3').comparability, 'not-comparable'))
test('same place never counts as two competitors', () => assert.match(compare(result, context, '1', '1').reasons[0], /같은 플레이스/))
