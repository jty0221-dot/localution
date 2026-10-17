export type CampaignInput = { url: string; source: string; medium: string; campaign: string; content: string; term: string }
export type CampaignResult = { valid: boolean; url: string; errors: Partial<Record<keyof CampaignInput, string>>; hasAutoTag: boolean }
export const EMPTY_CAMPAIGN_INPUT: CampaignInput = { url: '', source: '', medium: '', campaign: '', content: '', term: '' }

export function buildCampaignUrl(input: CampaignInput): CampaignResult {
  const errors: CampaignResult['errors'] = {}
  const clean = { ...EMPTY_CAMPAIGN_INPUT }
  for (const key of Object.keys(clean) as (keyof CampaignInput)[]) {
    const raw = input?.[key]
    if (typeof raw !== 'string') { errors[key] = '문자로 입력해 주세요.'; continue }
    clean[key] = raw.trim()
    if (raw.length > (key === 'url' ? 4096 : 200)) errors[key] = key === 'url' ? '주소는 4,096자 이내로 입력해 주세요.' : '200자 이내로 입력해 주세요.'
    else if (['url', 'source', 'medium', 'campaign'].includes(key) && !clean[key]) errors[key] = '필수 항목을 입력해 주세요.'
    else if (/[\u0000-\u001f\u007f]/.test(raw)) errors[key] = '줄바꿈이나 제어 문자를 제외해 주세요.'
  }
  let destination: URL | undefined
  if (!errors.url) {
    try {
      if (!/^https?:\/\/[^/?#]/i.test(clean.url) || /\s|\\/.test(clean.url) || /%(?![0-9a-f]{2})/i.test(clean.url)) throw new Error('invalid')
      destination = new URL(clean.url)
      if (!['http:', 'https:'].includes(destination.protocol) || !destination.hostname || destination.username || destination.password) throw new Error('invalid')
    } catch { errors.url = '로그인 정보가 없는 http 또는 https 전체 주소를 입력해 주세요.' }
  }
  if (Object.keys(errors).length || !destination) return { valid: false, url: '', errors, hasAutoTag: false }
  const hasAutoTag = Array.from(destination.searchParams.keys()).some(key => ['gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid'].includes(key.toLowerCase()))
  for (const key of Array.from(destination.searchParams.keys())) if (key.toLowerCase().startsWith('utm_')) destination.searchParams.delete(key)
  for (const key of ['source', 'medium', 'campaign', 'content', 'term'] as const) {
    if (clean[key]) destination.searchParams.set(`utm_${key}`, key === 'source' || key === 'medium' ? clean[key].toLowerCase() : clean[key])
  }
  return { valid: true, url: destination.toString(), errors, hasAutoTag }
}
