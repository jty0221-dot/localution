export const BUSINESS_INDUSTRIES = [
 { value: 'food', label: '음식점·카페' },
 { value: 'service', label: '생활 서비스' },
 { value: 'education', label: '학원·교육' },
 { value: 'retail', label: '소매·쇼핑' },
 { value: 'agency', label: '마케팅·대행업' },
] as const
export const BUSINESS_SEARCH_MODES = [
 { value: 'local', label: '매장 찾기' },
 { value: 'blog', label: '블로그 참고' },
 { value: 'cafe', label: '카페 글 참고' },
] as const
export type SearchProvider = 'naver' | 'google'
export type BusinessSearchItem = { title: string; url: string | null; description: string; address: string; source: string }
export type BusinessSearchResult = {
 ok: true; provider: SearchProvider; mode: string; query: string; industry: string;
 fetchedAt: string; items: BusinessSearchItem[]; sourceUrl: string; attributions: { text: string; url: string | null }[];
}
export function searchText(value: unknown): string {
 if (typeof value !== 'string') return ''
 return value.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
 .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').slice(0, 1500)
}
export function safeSearchUrl(value: unknown): string | null {
 if (typeof value !== 'string') return null
 try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null } catch { return null }
}

export type SearchConnections = Record<SearchProvider, { local: boolean; blog: boolean; cafe: boolean }>
