import assert from 'node:assert/strict'
import { filterOwnReviewRows } from '../app/lib/review-ownership.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

const rows = [
  { platform: 'naver_place', platform_review_id: 'a', user_id: 'me' },
  { platform: 'naver_place', platform_review_id: 'b', user_id: 'me' },
  { platform: 'baemin', platform_review_id: 'a', user_id: 'me' },
  { platform: 'naver_place', platform_review_id: 'c', user_id: 'me' },
]

check('남의 행은 빼고 내 행 · 새 행은 남긴다', () => {
  const existing = [
    { platform: 'naver_place', platform_review_id: 'a', user_id: 'other' },
    { platform: 'naver_place', platform_review_id: 'b', user_id: 'me' },
  ]
  const { kept, dropped } = filterOwnReviewRows(rows, existing, 'me')
  assert.equal(dropped, 1)
  assert.deepEqual(kept.map((r) => `${r.platform}:${r.platform_review_id}`), ['naver_place:b', 'baemin:a', 'naver_place:c'])
})
check('플랫폼이 다르면 같은 ID 라도 별개', () => {
  const { kept } = filterOwnReviewRows(rows, [{ platform: 'baemin', platform_review_id: 'b', user_id: 'other' }], 'me')
  assert.equal(kept.length, 4)
})
check('주인 없는(user_id null) 기존 행은 막지 않는다', () => {
  const { dropped } = filterOwnReviewRows(rows, [{ platform: 'naver_place', platform_review_id: 'a', user_id: null }], 'me')
  assert.equal(dropped, 0)
})
console.log(`${count} checks passed`)
