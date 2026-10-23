export type RankPoint = { date: string; rank: number | null; status: 'measured' | 'unranked' | 'missing'; visitorReviews: number | null; blogReviews: number | null; saves: number | null; saveText?: string | null }
export type RankSeries = { id: string; label: string; keyword: string; source: string; points: RankPoint[] }
const MAX_POINTS = 60000
function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}[-.]\d{2}[-.]\d{2}$/.test(value) || (value.includes('.') && value.includes('-'))) throw Error('날짜는 YYYY-MM-DD 또는 YYYY.MM.DD 형식이어야 해요.')
  const iso = value.replace(/\./g, '-')
  const d = new Date(`${iso}T00:00:00Z`)
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw Error(`실제 달력에 없는 날짜예요: ${value}`)
  return iso
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('항목은 객체여야 해요.')
  return value as Record<string, unknown>
}
function label(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000) throw Error(`${name}은 비어 있지 않은 1000자 이하 문자열이어야 해요.`)
  return value
}
function count(value: unknown, name: string): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') throw Error(`${name}은 숫자 또는 빈 값이어야 해요.`)
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) throw Error(`${name}은 음수가 아닌 정수여야 해요.`)
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0) throw Error(`${name}은 안전한 범위의 음수가 아닌 정수여야 해요.`)
  return n
}
function point(value: unknown, raw: boolean): RankPoint {
  const p = record(value)
  const date = dateValue(raw ? p.dailyDate : p.date)
  const valueRank = p.rank
  const explicitUnranked = p.status === 'unranked' || p.status === '권외' || p.status === '순위권밖' || valueRank === '권외' || valueRank === '순위권밖'
  if (p.status !== undefined && !['measured', 'missing', 'unranked', '권외', '순위권밖'].includes(p.status as string)) throw Error('알 수 없는 순위 상태예요.')
  const rank = explicitUnranked ? null : count(valueRank, '순위')
  if (explicitUnranked && valueRank !== '권외' && valueRank !== '순위권밖' && (count(valueRank, '순위') ?? 0) > 0) throw Error('권외 상태와 양수 순위가 충돌해요.')
  const status: RankPoint['status'] = explicitUnranked ? 'unranked' : rank === null || rank === 0 ? 'missing' : 'measured'
  if (p.status === 'measured' && status !== 'measured' || p.status === 'missing' && status !== 'missing') throw Error('순위와 상태가 충돌해요.')
  const saveValue = raw ? p.saveCnt : p.saves
  const saveText = raw && typeof saveValue === 'string' ? saveValue : p.saveText === undefined || p.saveText === null ? null : label(p.saveText, '저장 수 원문')
  const exactSave = typeof saveValue === 'string' && saveValue.trim() !== '' && !/^\d+$/.test(saveValue.trim()) ? null : count(saveValue, '저장 수')
  return { date, rank: status === 'measured' ? rank : null, status, visitorReviews: count(raw ? p.visitantReviewCnt : p.visitorReviews, '방문자 리뷰'), blogReviews: count(raw ? p.blogReviewCnt : p.blogReviews, '블로그 리뷰'), saves: exactSave, saveText }
}

export function parseRankHistory(text: string, fileName?: string): { series: RankSeries[]; errors: string[]; warnings: string[] } {
  const warnings: string[] = []
  try {
    if (typeof text !== 'string') throw Error('파일 내용은 문자열이어야 해요.')
    if (text.length > 5 * 1024 * 1024 || new TextEncoder().encode(text).length > 5 * 1024 * 1024) throw Error('파일은 5MB 이하여야 해요.')
    const content = text.replace(/^\uFEFF/, '').trim()
    if (!content) throw Error('파일에 데이터가 없어요.')
    const entries: { meta: Omit<RankSeries, 'points'>; points: unknown[]; raw: boolean }[] = []
    if (content.startsWith('{') || content.startsWith('[')) {
      const parsed: unknown = JSON.parse(content)
      const root = Array.isArray(parsed) ? null : record(parsed)
      const raw = !!root && Array.isArray(root.groups)
      const groups = Array.isArray(parsed) ? parsed : raw ? root!.groups : root?.series
      if (!Array.isArray(groups) || !groups.length || groups.length > 500) throw Error('series 또는 groups는 1~500개 배열이어야 해요.')
      for (const value of groups) {
        const g = record(value)
        const store = label(raw ? g['매장'] : g.label, '매장명')
        const keyword = label(raw ? g['키워드'] : g.keyword, '키워드')
        const source = g.source === undefined ? (raw ? '애드랭크 보관 JSON' : '가져온 순위 JSON') : label(g.source, '출처')
        const id = g.id === undefined ? JSON.stringify([store, keyword, source]) : label(g.id, '식별자')
        const points = raw ? g.ranks : g.points
        if (!Array.isArray(points)) throw Error('일자별 데이터는 배열이어야 해요.')
        entries.push({ meta: { id, label: store, keyword, source }, points, raw })
      }
    } else {
      const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trimStart().startsWith('#'))
      const header = lines.shift()?.split('\t') || []
      const required = ['매장', '키워드', '기준일', '오늘']
      if (!required.every(key => header.filter(h => h === key).length === 1)) throw Error('TSV에 매장·키워드·기준일·오늘 열이 필요해요.')
      warnings.push('TSV는 기준일과 오늘만 가져와요. 어제·7일전·시작·점수·진단은 해석하지 않으며 리뷰·저장 수는 없어요.')
      for (const line of lines) {
        const cells = line.split('\t')
        if (cells.length !== header.length) throw Error('TSV 열 수가 헤더와 달라요.')
        const cell = (key: string) => cells[header.indexOf(key)]
        const store = label(cell('매장'), '매장명'), keyword = label(cell('키워드'), '키워드')
        const source = '애드랭크 보관 TSV'
        entries.push({ meta: { id: JSON.stringify([store, keyword, source]), label: store, keyword, source }, points: [{ date: cell('기준일'), rank: cell('오늘') }], raw: false })
      }
      if (!entries.length) throw Error('TSV에 데이터 행이 없어요.')
    }
    const merged = new Map<string, { meta: Omit<RankSeries, 'points'>; points: Map<string, RankPoint> }>()
    let pointCount = 0
    for (const entry of entries) {
      let group = merged.get(entry.meta.id)
      if (group && JSON.stringify(group.meta) !== JSON.stringify(entry.meta)) throw Error('같은 식별자에 서로 다른 매장·키워드·출처가 있어요.')
      if (!group) { group = { meta: entry.meta, points: new Map() }; merged.set(entry.meta.id, group) }
      if (merged.size > 500) throw Error('시리즈는 500개 이하여야 해요.')
      for (const value of entry.points) {
        if (++pointCount > MAX_POINTS) throw Error('일자 항목은 총 60000개 이하여야 해요.')
        const p = point(value, entry.raw), old = group.points.get(p.date)
        if (old && JSON.stringify(old) !== JSON.stringify(p)) throw Error(`${p.date}에 충돌하는 중복 데이터가 있어요.`)
        group.points.set(p.date, p)
      }
    }
    const series = Array.from(merged.values()).map(g => ({ ...g.meta, points: Array.from(g.points.values()).sort((a,b) => a.date.localeCompare(b.date)) }))
    const dates = series.flatMap(s => s.points.map(p => p.date)).sort()
    if (!dates.length) throw Error('일자별 데이터가 없어요.')
    const first = new Date(`${dates[0]}T00:00:00Z`), limit = new Date(first)
    limit.setUTCFullYear(first.getUTCFullYear() + 2)
    if (new Date(`${dates[dates.length - 1]}T00:00:00Z`) > limit) throw Error('날짜 범위는 2년 이하여야 해요.')
    if (series.some(s => s.points.some(p => p.saveText && p.saves === null))) warnings.push('정확한 숫자가 아닌 저장 수 원문은 보존하고 증감 계산에서 제외해요.')
    if (fileName) warnings.push('파일 이름의 날짜로 기준일을 바꾸지 않았어요.')
    return { series, errors: [], warnings }
  } catch (error) { return { series: [], errors: [error instanceof Error ? error.message : '파일을 읽을 수 없어요.'], warnings: [] } }
}

export function summarizeRankSeries(series: RankSeries, from?: string, to?: string) {
  const empty = { latest: null as RankPoint | null, previous: null as RankPoint | null, lastMeasured: null as RankPoint | null, delta: null as number | null, best: null as number | null, worst: null as number | null, average: null as number | null, measuredCount: 0, unrankedCount: 0, missingCount: 0, visitorReviewDelta: null as number | null, blogReviewDelta: null as number | null, saveDelta: null as number | null }
  let start: string | undefined, end: string | undefined
  try { start = from ? dateValue(from) : undefined; end = to ? dateValue(to) : undefined } catch { return empty }
  if (start && end && start > end || !series || !Array.isArray(series.points)) return empty
  const points = series.points.filter(p => (!start || p.date >= start) && (!end || p.date <= end)).slice().sort((a,b) => a.date.localeCompare(b.date))
  const latest = points.at(-1) || null, previous = points.at(-2) || null
  const measured = points.filter(p => p.status === 'measured' && p.rank !== null)
  const ranks = measured.map(p => p.rank as number)
  const diff = (key: 'visitorReviews' | 'blogReviews' | 'saves') => latest?.[key] !== null && latest?.[key] !== undefined && previous?.[key] !== null && previous?.[key] !== undefined ? latest[key]! - previous[key]! : null
  return { ...empty, latest, previous, lastMeasured: measured.at(-1) || null,
    delta: latest?.status === 'measured' && previous?.status === 'measured' && latest.rank !== null && previous.rank !== null ? previous.rank - latest.rank : null,
    best: ranks.length ? Math.min(...ranks) : null, worst: ranks.length ? Math.max(...ranks) : null, average: ranks.length ? ranks.reduce((a,b) => a+b, 0) / ranks.length : null,
    measuredCount: measured.length, unrankedCount: points.filter(p => p.status === 'unranked').length, missingCount: points.filter(p => p.status === 'missing').length,
    visitorReviewDelta: diff('visitorReviews'), blogReviewDelta: diff('blogReviews'), saveDelta: diff('saves') }
}
export const SAMPLE_RANK_HISTORY_JSON = JSON.stringify({ series: [{ id: 'synthetic-example', label: '합성 예시 매장', keyword: '예시 동네 카페', source: '가상으로 만든 체험 데이터', points: [
  {date:'2026-10-15',rank:12,status:'measured',visitorReviews:30,blogReviews:10,saves:20},
  {date:'2026-10-16',rank:null,status:'missing',visitorReviews:null,blogReviews:null,saves:null},
  {date:'2026-10-17',rank:8,status:'measured',visitorReviews:32,blogReviews:11,saves:null,saveText:'100+'},
  {date:'2026-10-18',rank:6,status:'measured',visitorReviews:35,blogReviews:11,saves:null,saveText:'100+'},
] }] }, null, 2)
