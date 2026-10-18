type Requester = typeof fetch
export type TranslationResult = { updates: Record<string, string>; succeeded: number; failed: number }
export async function translateMenuFields(item: Record<string, any>, languages: string[], onlyEmpty: boolean, request: Requester = fetch): Promise<TranslationResult> {
 const result: TranslationResult = { updates: {}, succeeded: 0, failed: 0 }
 for (const lang of languages) for (const field of ['name', 'desc']) {
 const text = item[field + '_ko']
 const key = field + '_' + lang
 if (!text || (onlyEmpty && item[key])) continue
 try {
 const response = await request('/api/translate/papago', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source: 'ko', target: lang === 'zh' ? 'zh-CN' : lang }) })
 const data = await response.json()
 if (!response.ok || data?.ok !== true || typeof data.translated !== 'string' || !data.translated.trim()) throw new Error('translation failed')
 result.updates[key] = data.translated; result.succeeded++
 } catch { result.failed++ }
 }
 return result
}
export function mergeTranslatedInput<T extends Record<string, any>>(current: T | null, original: T, updates: Record<string, string>): T | null {
 if (!current || current.id !== original.id || current.name_ko !== original.name_ko || current.desc_ko !== original.desc_ko) return current
 const safe = Object.fromEntries(Object.entries(updates).filter(([key]) => current[key] === original[key]))
 return { ...current, ...safe }
}
export async function saveMenuTranslation(id: string, updates: Record<string, string>, request: Requester = fetch): Promise<boolean> {
 try {
 const response = await request('/api/menu', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
 const data = await response.json()
 return response.ok && data?.ok === true
 } catch { return false }
}
