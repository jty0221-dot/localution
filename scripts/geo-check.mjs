// ═══════════════════════════════════════════════════════════
// geo-check · SEO / AEO / GEO 게이트
//
// 왜 있나 : 구조화 데이터와 화면이 어긋나면 검색 엔진은 조용히 무시하고
// AI 답변 엔진은 인용을 멈춘다. 눈으로 세지 않고 스크립트가 통과시켜야 나간다.
//
// 쓰는 법
//   node scripts/geo-check.mjs                 소스만 본다 (빌드 전 게이트)
//   node scripts/geo-check.mjs --url http://localhost:3000
//                                              소스 + 살아 있는 서버의 robots · sitemap · manifest · llms.txt · JSON-LD 까지 본다
//   GEO_CHECK_URL=https://www.localution.co.kr node scripts/geo-check.mjs   (--url 과 같다)
//
// 종료 코드 : 0 통과 · 1 실패 (하나라도 걸리면)
//
// 보는 것
//   S1  홈 FAQ : 화면에 보이는 목록(HOME_FAQS)과 FAQPage 스키마가 같은 배열에서 나오는가
//   S2  스스로 매기는 평점(AggregateRating)을 내보내는 곳이 없는가 (읽어 오는 코드는 대상 아님)
//   S3  공개 라우트 layout 이 pageMetadata 를 쓰는가 (사실 정본 한 곳)
//   S4  사용자 눈에 들어가는 문자열에 긴 대시(—)가 없는가 (주석 · 변수명은 제외)
//   S5  이모지가 없는가 (CLAUDE.md 절대 규칙 · 주석 포함 전부)
//   S6  잘못된 컨테이너 폭(max-w-7xl) 이 없는가
//   L1  --url : /robots.txt · /sitemap.xml · /manifest.webmanifest · /llms.txt 가 200 인가
//   L2  --url : 공개 페이지 JSON-LD 가 파싱되고 @graph 안에 WebPage 가 있는가 · 비공개 경로에 X-Robots-Tag 가 붙는가
// ═══════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const APP = join(ROOT, 'app')

const argUrl = (() => {
  const i = process.argv.indexOf('--url')
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].replace(/\/$/, '')
  return (process.env.GEO_CHECK_URL || '').replace(/\/$/, '')
})()

const failures = []
const notes = []
const fail = (code, msg) => failures.push(`[${code}] ${msg}`)
const note = (code, msg) => notes.push(`[${code}] ${msg}`)

// ─── 파일 걷기 ───────────────────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name.startsWith('_')) continue
      walk(p, out)
    } else if (/\.(tsx|ts|js|mjs)$/.test(name)) out.push(p)
  }
  return out
}
const rel = (p) => relative(ROOT, p).split(sep).join('/')
const read = (p) => readFileSync(p, 'utf8')

// 주석을 지운다 (// 줄 · /* */ 블록 · JSX {/* */}) · 문자열 안 '//' (URL) 은 살린다
function stripComments(src) {
  let out = ''
  let i = 0
  let quote = null // ' " `
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (quote) {
      out += c
      if (c === '\\') { out += n ?? ''; i += 2; continue }
      if (c === quote) quote = null
      i++; continue
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && n === '*') {
      const e = src.indexOf('*/', i + 2)
      const end = e < 0 ? src.length : e + 2
      out += src.slice(i, end).replace(/[^\n]/g, '') // 줄 번호를 지키려고 개행만 남긴다
      i = end; continue
    }
    out += c; i++
  }
  return out
}

const files = walk(APP)
const tsx = files.filter((f) => f.endsWith('.tsx'))

// ─── S1 홈 FAQ 정합 ──────────────────────────────────────────
{
  const home = read(join(APP, 'page.tsx'))
  const hasArray = /const HOME_FAQS\s*:\s*FaqItem\[\]\s*=/.test(home)
  const schemaUsesArray = /faqPageLd\(\s*HOME_FAQS/.test(home)
  const visibleUsesArray = /<FaqSlider\s+faqs=\{HOME_FAQS\}/.test(home)
  if (!hasArray) fail('S1', 'app/page.tsx 에 HOME_FAQS 배열이 없다')
  if (!schemaUsesArray) fail('S1', 'FAQPage 스키마가 HOME_FAQS 에서 나오지 않는다 (faqPageLd(HOME_FAQS ...))')
  if (!visibleUsesArray) fail('S1', '화면 FAQ 가 HOME_FAQS 에서 나오지 않는다 (<FaqSlider faqs={HOME_FAQS} />)')
  const count = (home.match(/\{\s*q:\s*['"`]/g) || []).length
  if (hasArray && schemaUsesArray && visibleUsesArray) note('S1', `홈 FAQ ${count}개 · 화면과 스키마가 같은 배열`)
  if (/type="application\/ld\+json"/.test(home)) fail('S1', 'app/page.tsx 에 손으로 쓴 ld+json 스크립트가 남아 있다 (JsonLd 컴포넌트만 쓴다)')
}

// ─── S2 AggregateRating 내보내기 금지 ────────────────────────
for (const f of files) {
  const s = stripComments(read(f))
  if (/['"]@type['"]\s*:\s*['"]AggregateRating['"]/.test(s) || /aggregateRating\s*:\s*\{/.test(s)) {
    fail('S2', `${rel(f)} 가 AggregateRating 을 내보낸다 (스스로 매기는 평점 금지)`)
  }
}

// ─── S3 공개 라우트 layout 이 정본을 쓰는가 ───────────────────
{
  const seo = read(join(APP, 'lib', 'seo.ts'))
  const routes = [...seo.matchAll(/\{\s*path:\s*'([^']*)'/g)].map((m) => m[1]).filter(Boolean)
  const layoutsWithMeta = []
  const layoutsWithout = []
  for (const r of routes) {
    const lp = join(APP, ...r.split('/'), 'layout.tsx')
    const pp = join(APP, ...r.split('/'), 'page.tsx')
    let pageIsClient = false
    try { pageIsClient = /^\s*'use client'/.test(read(pp)) } catch { /* 페이지 없음 */ }
    let layoutSrc = ''
    try { layoutSrc = read(lp) } catch { /* 레이아웃 없음 */ }
    if (layoutSrc && /pageMetadata\(/.test(layoutSrc)) layoutsWithMeta.push(r)
    else if (pageIsClient) layoutsWithout.push(r)
  }
  note('S3', `공개 라우트 ${routes.length}개 · pageMetadata layout ${layoutsWithMeta.length}개`)
  if (layoutsWithout.length) note('S3', `use client 페이지인데 metadata layout 이 없는 공개 라우트 (다음 단계) : ${layoutsWithout.join(', ')}`)
  if (routes.includes('qr')) fail('S3', "'qr' 은 /qr-admin 으로 넘기는 페이지다. PUBLIC_ROUTES 에 두지 않는다")
}

// ─── S4 긴 대시 (사용자 문자열) ──────────────────────────────
{
  const hits = []
  for (const f of tsx) {
    const s = stripComments(read(f))
    const lines = s.split('\n')
    lines.forEach((ln, i) => { if (ln.includes('\u2014')) hits.push(`${rel(f)}:${i + 1}`) })
  }
  if (hits.length) fail('S4', `긴 대시(—) ${hits.length}곳 · 마침표나 가운뎃점으로 바꾼다\n    ${hits.slice(0, 40).join('\n    ')}${hits.length > 40 ? `\n    ... 외 ${hits.length - 40}곳` : ''}`)
  else note('S4', '긴 대시 0곳')
}

// ─── S5 이모지 ───────────────────────────────────────────────
{
  const emoji = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{FE0F}]/u
  const hits = []
  for (const f of tsx) {
    read(f).split('\n').forEach((ln, i) => { if (emoji.test(ln)) hits.push(`${rel(f)}:${i + 1}`) })
  }
  if (hits.length) fail('S5', `이모지 ${hits.length}곳 · lucide 아이콘으로 바꾼다\n    ${hits.slice(0, 40).join('\n    ')}${hits.length > 40 ? `\n    ... 외 ${hits.length - 40}곳` : ''}`)
  else note('S5', '이모지 0곳')
}

// ─── S6 컨테이너 폭 ──────────────────────────────────────────
{
  const hits = []
  for (const f of tsx) {
    read(f).split('\n').forEach((ln, i) => { if (/max-w-7xl/.test(ln)) hits.push(`${rel(f)}:${i + 1}`) })
  }
  if (hits.length) fail('S6', `max-w-7xl ${hits.length}곳 · 어드민은 max-w-6xl, 단일 카드는 max-w-4xl\n    ${hits.join('\n    ')}`)
  else note('S6', 'max-w-7xl 0곳')
}

// ─── L1 · L2 살아 있는 서버 ──────────────────────────────────
async function live() {
  if (!argUrl) { note('L', '--url 없음 · 서버 검사는 건너뛴다'); return }
  const get = async (path) => {
    try {
      const res = await fetch(argUrl + path, { redirect: 'manual', headers: { 'user-agent': 'geo-check/1.0' } })
      return { status: res.status, headers: res.headers, text: await res.text() }
    } catch (e) { return { status: 0, headers: new Headers(), text: String(e) } }
  }
  for (const p of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/llms.txt']) {
    const r = await get(p)
    if (r.status !== 200) fail('L1', `${p} → ${r.status}`)
    else note('L1', `${p} 200 · ${r.text.length}자`)
    if (p === '/robots.txt' && r.status === 200 && !/Sitemap:/i.test(r.text)) fail('L1', 'robots.txt 에 Sitemap: 줄이 없다')
    if (p === '/llms.txt' && r.status === 200 && !/^# /m.test(r.text)) fail('L1', 'llms.txt 첫 줄이 # 제목이 아니다')
  }
  const publicPages = ['/', '/service-intro', '/pricing', '/about', '/marketing/place']
  for (const p of publicPages) {
    const r = await get(p)
    if (r.status !== 200) { fail('L2', `${p} → ${r.status}`); continue }
    const blocks = [...r.text.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    if (!blocks.length) { fail('L2', `${p} 에 JSON-LD 가 없다`); continue }
    let ok = true
    for (const b of blocks) {
      try {
        const j = JSON.parse(b)
        const types = (j['@graph'] || [j]).map((n) => n['@type']).flat()
        if (p !== '/' && !types.includes('WebPage')) fail('L2', `${p} JSON-LD 에 WebPage 가 없다 (있는 것 : ${types.join(', ')})`)
        if (types.includes('AggregateRating')) fail('L2', `${p} 가 AggregateRating 을 내보낸다`)
      } catch (e) { ok = false; fail('L2', `${p} JSON-LD 파싱 실패 : ${String(e).slice(0, 80)}`) }
    }
    if (ok) note('L2', `${p} JSON-LD ${blocks.length}블록 파싱 통과`)
    if ((r.headers.get('x-robots-tag') || '').includes('noindex')) fail('L2', `${p} 공개 페이지에 noindex 헤더가 붙었다`)
    const answerBlocks = (r.text.match(/data-geo="answer"/g) || []).length
    if (p !== '/' && answerBlocks === 0) note('L2', `${p} 에 AnswerBlock(data-geo="answer") 이 첫 응답에 없다 · use client 페이지는 하이드레이션 뒤 그려질 수 있다`)
  }
  for (const p of ['/admin', '/dashboard', '/qr', '/api/billing/me']) {
    const r = await get(p)
    const tag = r.headers.get('x-robots-tag') || ''
    if (!tag.includes('noindex')) fail('L2', `${p} 비공개 경로에 X-Robots-Tag noindex 가 없다 (status ${r.status})`)
  }
}

await live()

// ─── 결과 ────────────────────────────────────────────────────
for (const n of notes) console.log('  ok  ' + n)
if (failures.length) {
  console.log('')
  for (const f of failures) console.log('  FAIL ' + f)
  console.log(`\ngeo-check : ${failures.length}건 실패`)
  process.exit(1)
}
console.log('\ngeo-check : 통과')
