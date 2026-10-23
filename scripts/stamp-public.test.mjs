import assert from 'node:assert/strict'
import { publicStampCard, publicStampCollection } from '../app/lib/stamp-public.ts'

let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }

const card = {
  id: 'c1', user_id: 'owner-uuid', store_slug: 's', active: true, created_at: 'x',
  title: '단골 카드', description: '설명', required_stamps: 10, reward_text: '아메리카노',
  theme_color: '#3182F6', milestones: [{ at: 5, reward: '쿠키' }], owner_name: '가게', owner_phone: '0212345678',
}
const row = {
  id: 'r1', stamp_card_id: 'c1', store_slug: 's', customer_phone: '01012345678', customer_name: '손님',
  consent_marketing: true, current_stamps: 3, total_collected: 13, rewards_claimed: 1,
  last_visit_at: '2026-10-23T00:00:00Z', enrolled_at: '2026-01-01T00:00:00Z',
}

check('카드는 화면 필드만', () => {
  const c = publicStampCard(card)
  assert.deepEqual(Object.keys(c).sort(), ['description', 'milestones', 'owner_name', 'owner_phone', 'required_stamps', 'reward_text', 'theme_color', 'title'])
  assert.equal(c.user_id, undefined); assert.equal(c.id, undefined)
  assert.equal(c.required_stamps, 10)
})
check('적립은 숫자 셋만 · 개인정보 없음', () => {
  const c = publicStampCollection(row)
  assert.deepEqual(c, { current_stamps: 3, total_collected: 13, rewards_claimed: 1 })
  const json = JSON.stringify(c)
  for (const leak of ['01012345678', '손님', 'consent', 'customer', 'stamp_card_id']) assert.ok(!json.includes(leak), leak)
})
check('없으면 null', () => {
  assert.equal(publicStampCard(null), null)
  assert.equal(publicStampCollection(undefined), null)
})
check('숫자가 아니면 0', () => {
  assert.deepEqual(publicStampCollection({ current_stamps: 'x', total_collected: null }), { current_stamps: 0, total_collected: 0, rewards_claimed: 0 })
})
console.log(`${count} checks passed`)
