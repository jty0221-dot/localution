import assert from 'node:assert/strict'
import {
  isReviewReplied, parseInboxFilter, buildReviewsRedirect, readPlatformCounts,
  sumKnown, formatCount, filterFeed,
} from '../app/lib/review-inbox.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

check('답글 판정 — stores/me 와 같은 기준', () => {
  assert.equal(isReviewReplied({ has_reply: true, reply_status: null }), true)
  assert.equal(isReviewReplied({ has_reply: false, reply_status: 'submitted' }), true)
  assert.equal(isReviewReplied({ has_reply: false, reply_status: null }), false)
  assert.equal(isReviewReplied({ has_reply: false, reply_status: 'draft' }), false)
  assert.equal(isReviewReplied({ has_reply: false, reply_status: 'failed' }), false)
  assert.equal(isReviewReplied(null), false)
})

check('?filter 해석 — 미답변 별칭 · 배열 · 모르는 값', () => {
  assert.equal(parseInboxFilter('unanswered'), 'unanswered')
  assert.equal(parseInboxFilter(' Unreplied '), 'unanswered')
  assert.equal(parseInboxFilter(['unanswered', 'all']), 'unanswered')
  assert.equal(parseInboxFilter('low-rating'), 'all')
  assert.equal(parseInboxFilter(null), 'all')
  assert.equal(parseInboxFilter(undefined), 'all')
})

check('/reviews → /review-admin 쿼리 보존', () => {
  assert.equal(buildReviewsRedirect({ filter: 'unanswered' }), '/review-admin?filter=unanswered')
  assert.equal(buildReviewsRedirect({}), '/review-admin')
  assert.equal(buildReviewsRedirect(undefined), '/review-admin')
  assert.equal(buildReviewsRedirect({ filter: 'unanswered', platform: ['naver', 'kakao'], x: undefined }),
    '/review-admin?filter=unanswered&platform=naver&platform=kakao')
  // 인코딩 — 한글 · 특수문자는 안전하게
  assert.equal(buildReviewsRedirect({ q: '맛집 & 카페' }), '/review-admin?q=%EB%A7%9B%EC%A7%91+%26+%EC%B9%B4%ED%8E%98')
})

check('모르는 수는 null — 리뷰 집계를 못 읽었으면 0 을 믿지 않는다', () => {
  assert.deepEqual(readPlatformCounts({ review_count: 0, unreplied_count: 0 }, false), { reviewCount: null, unreplied: null })
  assert.deepEqual(readPlatformCounts({ review_count: 12, unreplied_count: 3 }, true), { reviewCount: 12, unreplied: 3 })
  assert.deepEqual(readPlatformCounts(undefined, true), { reviewCount: null, unreplied: null })
  assert.deepEqual(readPlatformCounts({ review_count: 5 }, true), { reviewCount: 5, unreplied: null })
})

check('합계 — 하나라도 모르면 모른다', () => {
  assert.equal(sumKnown([1, 2, 3]), 6)
  assert.equal(sumKnown([1, null, 3]), null)
  assert.equal(sumKnown([]), 0)
  assert.equal(sumKnown([0, 0]), 0)
})

check('표기 — null 은 - · 0 은 0', () => {
  assert.equal(formatCount(null), '-')
  assert.equal(formatCount(undefined), '-')
  assert.equal(formatCount(0), '0')
  assert.equal(formatCount(1234), '1,234')
  assert.equal(formatCount(Number.NaN), '-')
})

check('피드 필터 — 답글 상태 × 매체', () => {
  const feed = [
    { id: 'a', platform: 'naver', replied: false },
    { id: 'b', platform: 'naver', replied: true },
    { id: 'c', platform: 'kakao', replied: false },
  ]
  assert.deepEqual(filterFeed(feed, { filter: 'all', platform: 'all' }).map(r => r.id), ['a', 'b', 'c'])
  assert.deepEqual(filterFeed(feed, { filter: 'unanswered', platform: 'all' }).map(r => r.id), ['a', 'c'])
  assert.deepEqual(filterFeed(feed, { filter: 'unanswered', platform: 'naver' }).map(r => r.id), ['a'])
  assert.deepEqual(filterFeed(feed, { filter: 'all', platform: 'kakao' }).map(r => r.id), ['c'])
})

console.log(`review-inbox: ${count} checks passed`)
