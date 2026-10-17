export const SUPPORT_REGIONS = ['서울', '부산', '대구', '인천', '광주', '전남', '전남광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '경북', '경남', '제주'] as const
export const SUPPORT_FIELDS = ['금융', '기술', '인력', '수출', '내수', '창업', '경영', '기타'] as const
export interface SupportProgram { id: string; title: string; url: string; agency: string; category: string; target: string; period: string; summary: string; tags: string[]; publishedAt: string }
export interface SupportFilters { region: string; field: string; q: string }

export function supportFilters(params: URLSearchParams): SupportFilters {
 const clean = (key: string) => (params.get(key) || '').trim()
 const region = clean('region'), field = clean('field'), q = clean('q')
 if (q.length > 100 || region.length > 20 || field.length > 20 || (region && !['전체', '전국', ...SUPPORT_REGIONS].includes(region)) || (field && !['전체', ...SUPPORT_FIELDS].includes(field))) throw new Error('invalid_input')
 return { region: ['전체', '전국'].includes(region) ? '' : region, field: field === '전체' ? '' : field, q }
}
export function supportText(value: unknown, max = 2000): string {
 if (typeof value !== 'string' && typeof value !== 'number') return ''
 return String(value).slice(0, 20000).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '' }).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
export function normalizeSupportPrograms(payload: unknown, q = ''): SupportProgram[] {
 if (!record(payload) || !record(payload.jsonArray) || !Object.prototype.hasOwnProperty.call(payload.jsonArray, 'item')) throw new Error('invalid_schema')
 const raw = payload.jsonArray.item
 const rows = Array.isArray(raw) ? raw : record(raw) ? [raw] : null
 if (!rows || rows.length > 100) throw new Error('invalid_schema')
 const seen = new Set<string>()
 const result: SupportProgram[] = []
 for (const row of rows) {
 if (!record(row)) throw new Error('invalid_item')
 const id = supportText(row.seq || row.pblancId, 150), title = supportText(row.title || row.pblancNm, 300)
 const link = supportText(row.link || row.pblancUrl, 3000)
 if (!id || !title || !link) throw new Error('invalid_item')
 let url: URL
 try { url = new URL(link, 'https://www.bizinfo.go.kr') } catch { throw new Error('invalid_url') }
 if (url.protocol !== 'https:' || !['www.bizinfo.go.kr', 'bizinfo.go.kr'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('invalid_url')
 const item: SupportProgram = { id, title, url: url.href, agency: supportText(row.author || row.jrsdInsttNm || row.excInsttNm, 200), category: supportText(row.lcategory || row.pldirSportRealmLclasCodeNm, 100), target: supportText(row.trgetNm, 500), period: supportText(row.reqstDt || row.reqstBeginEndDe, 200), summary: supportText(row.description || row.bsnsSumryCn), tags: supportText(row.hashTags, 1000).split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 30), publishedAt: supportText(row.pubDate || row.creatPnttm, 100) }
 if (!seen.has(id)) { seen.add(id); result.push(item) }
 }
 const query = q.normalize('NFKC').toLocaleLowerCase('ko-KR').trim()
 return result.filter(item => !query || [item.title, item.agency, item.category, item.target, item.summary, ...item.tags].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR').includes(query)).slice(0, 30)
}
