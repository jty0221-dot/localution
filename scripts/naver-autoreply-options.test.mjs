import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveNaverAutoreplyOptions, describeManualRun, MANUAL_MAX_PER_RUN } from '../app/lib/naver-autoreply-options.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

check('크론은 auto_approve 를 따른다', () => {
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_auto_approve: true }, 'cron').autoApprove, true)
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_auto_approve: 'true' }, 'cron').autoApprove, false)
  assert.equal(resolveNaverAutoreplyOptions({}, 'cron').autoApprove, false)
})

check('수동 실행은 절대 바로 발행하지 않는다', () => {
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_auto_approve: true }, 'manual').autoApprove, false)
})

check('건수 상한 — 크론 1~20 · 수동 최대 10', () => {
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_max_per_run: 50 }, 'cron').maxPerRun, 20)
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_max_per_run: 50 }, 'manual').maxPerRun, MANUAL_MAX_PER_RUN)
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_max_per_run: 3 }, 'manual').maxPerRun, 3)
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_max_per_run: 0 }, 'cron').maxPerRun, 5)
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_max_per_run: 'x' }, 'cron').maxPerRun, 5)
  assert.equal(resolveNaverAutoreplyOptions(null, 'cron').maxPerRun, 5)
})

check('말투 · 사업장 id', () => {
  assert.equal(resolveNaverAutoreplyOptions({}, 'cron').tone, 'friendly')
  assert.equal(resolveNaverAutoreplyOptions({ autoreply_tone: 'expert' }, 'manual').tone, 'expert')
  assert.equal(resolveNaverAutoreplyOptions({ smartplace_biz_id: 12345 }, 'cron').bizId, '12345')
  assert.equal(resolveNaverAutoreplyOptions({ smartplace_biz_id: '  ' }, 'cron').bizId, null)
  assert.equal(resolveNaverAutoreplyOptions({}, 'cron').bizId, null)
})

check('결과 문장 — 개발자 말 없음', () => {
  assert.match(describeManualRun({ drafted: 0, skipped: 0, candidates: 0 }), /만들 리뷰가 없어요/)
  assert.match(describeManualRun({ drafted: 0, skipped: 3, candidates: 3 }), /3건 모두 실패/)
  assert.equal(describeManualRun({ drafted: 2, skipped: 1, candidates: 3 }), 'AI 초안 2건을 만들었어요 · 1건은 만들지 못했어요. 아래 목록에서 확인하고 승인해주세요.')
  assert.equal(describeManualRun({ drafted: 4, skipped: 0, candidates: 4 }), 'AI 초안 4건을 만들었어요. 아래 목록에서 확인하고 승인해주세요.')
})

check('정적 확인 — 화면은 크론 경로를 부르지 않고 크론 인증은 그대로', () => {
  const page = readFileSync(new URL('../app/review-admin/naver/autoreply/page.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('/api/cron/naver-reply-generate'), false)
  assert.ok(page.includes('/api/naver-autoreply/run-now'))
  const cron = readFileSync(new URL('../app/api/cron/naver-reply-generate/route.ts', import.meta.url), 'utf8')
  assert.ok(cron.includes('if (!secret) return false'))
  assert.ok(cron.includes("resolveNaverAutoreplyOptions(extra, 'cron')"))
  const runNow = readFileSync(new URL('../app/api/naver-autoreply/run-now/route.ts', import.meta.url), 'utf8')
  assert.ok(runNow.includes('requirePaidQuota('))
  assert.ok(runNow.includes("resolveNaverAutoreplyOptions(extra, 'manual')"))
  // 본문 · 쿼리에서 user_id 를 받지 않는다 (POST 인자 없음)
  assert.ok(runNow.includes('export async function POST()'))
})

console.log(`naver-autoreply-options: ${count} checks passed`)
