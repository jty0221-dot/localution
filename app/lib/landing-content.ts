export type LandingStat = { num: string; label: string }
export type LandingHero = {
  reviewsPerMonth: string
  reviewsPerMonthLabel: string
  avgRating: string
  avgRatingLabel: string
}
export type LandingTestimonial = {
  name: string
  store: string
  text: string
  rating: number
  iconKey: 'coffee' | 'food' | 'gym'
  color: string
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// Each section needs its own complete payload before losing its example label.
export function parseLandingContent(value: unknown): {
  stats?: LandingStat[]
  hero?: LandingHero
  testimonials?: LandingTestimonial[]
} {
  if (!record(value)) return {}
  const result: ReturnType<typeof parseLandingContent> = {}
  if (Array.isArray(value.stats) && value.stats.length === 4 && value.stats.every(item =>
    record(item) && text(item.num) && text(item.label))) {
    result.stats = value.stats as LandingStat[]
  }
  const hero = value.hero
  if (record(hero) && text(hero.reviewsPerMonth) && text(hero.reviewsPerMonthLabel) &&
    text(hero.avgRating) && text(hero.avgRatingLabel)) {
    result.hero = hero as LandingHero
  }
  if (Array.isArray(value.testimonials) && value.testimonials.length > 0 && value.testimonials.every(item =>
    record(item) && text(item.name) && text(item.store) && text(item.text) &&
    typeof item.rating === 'number' && Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 &&
    ['coffee', 'food', 'gym'].includes(String(item.iconKey)) && text(item.color))) {
    result.testimonials = value.testimonials as LandingTestimonial[]
  }
  return result
}
