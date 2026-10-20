import { supportText, type SupportProgram } from './support-programs'

export const MSS_RSS_URL = 'https://mss.go.kr/rss/smba/board/310.do'
export const MSS_RSS_COVERAGE = '중소벤처기업부가 제공하는 최근 사업공고 최대 20건입니다. 지역·분야·신청기간·지원대상은 원문에서 확인해주세요.'
// Official RSS reader metadata only. Never return article text, attachments or personal contacts.
export function normalizeMssAnnouncements(xml: string, q = ''): SupportProgram[] {
 if (/<!DOCTYPE|<!ENTITY/i.test(xml) || !/<rss\b[^>]*>/i.test(xml) || !/<\/rss>\s*$/i.test(xml) || !/<channel\b[^>]*>[\s\S]*<\/channel>/i.test(xml)) throw new Error('invalid_rss')
 const blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
 if (blocks.length > 20 || (xml.match(/<item\b/gi) || []).length !== blocks.length) throw new Error('invalid_items')
 const seen = new Set<string>()
 const items = blocks.map(([, block]) => {
 const field = (tag: string) => {
 const matches = [...block.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
 if (matches.length !== 1) throw new Error('invalid_field')
 return supportText(matches[0][1].replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/, '$1'), 3000)
 }
 const title = field('title'), link = field('link'), date = field('pubDate')
 const url = new URL(link)
 if (url.origin !== 'https://www.mss.go.kr' || url.pathname !== '/site/smba/ex/bbs/View.do' || url.username || url.password || url.hash || url.searchParams.get('cbIdx') !== '310' || !/^\d+$/.test(url.searchParams.get('bcIdx') || '') || [...url.searchParams.keys()].some(k => !['cbIdx', 'bcIdx'].includes(k))) throw new Error('invalid_link')
 if (!title || !/^\d{14}$/.test(date)) throw new Error('invalid_metadata')
 const publishedAt = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`
 if (!Number.isFinite(Date.parse(publishedAt)) || new Date(publishedAt).toISOString().slice(0,10) !== publishedAt) throw new Error('invalid_date')
 return { id: 'mss-' + url.searchParams.get('bcIdx'), title, url: url.href, agency: '중소벤처기업부', category: '', target: '', period: '', summary: '', tags: [], publishedAt } satisfies SupportProgram
 })
 const query = q.normalize('NFKC').toLocaleLowerCase('ko-KR').trim()
 return items.filter(item => {
 if (seen.has(item.id)) return false
 seen.add(item.id)
 return !query || item.title.normalize('NFKC').toLocaleLowerCase('ko-KR').includes(query)
 })
}
