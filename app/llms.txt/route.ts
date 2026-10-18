// ═══════════════════════════════════════════════════════════
// /llms.txt
// AI 검색·답변 엔진(ChatGPT · Claude · Perplexity)이 사이트를 요약할 때
// 먼저 읽는 파일. 사실은 전부 app/lib/seo.ts 에서 가져온다 (GEO).
// ═══════════════════════════════════════════════════════════

import { SITE, PUBLIC_ROUTES, absUrl } from '../lib/seo'

export const revalidate = 86400

export function GET() {
  const lines: string[] = []
  lines.push(`# ${SITE.name} (${SITE.nameEn})`)
  lines.push('')
  lines.push(`> ${SITE.answer}`)
  lines.push('')
  lines.push('## 핵심 사실')
  lines.push(`- 서비스명: ${SITE.name} (${SITE.nameEn})`)
  lines.push(`- 한 줄 소개: ${SITE.tagline}`)
  lines.push(`- 대상: ${SITE.audience.join(', ')}`)
  lines.push(`- 연결 대상 플랫폼: ${SITE.platforms.join(', ')}. 실제 이용 가능 여부는 계정별 권한과 수집 상태 확인이 필요합니다.`)
  lines.push('- 리뷰 답글과 외부 발행은 계정 연결, 수집 상태와 기능별 설정을 확인한 뒤 사용합니다.')
  lines.push('- 연결 설정만으로 수집·발행 성공이 보장되지는 않습니다. 실제 실행 이력과 결과를 확인해야 합니다.')
  lines.push(`- 요금: ${SITE.priceText}부터 (기능 선택형 · 신용카드 없이 시작)`)
  lines.push(`- 운영: ${SITE.legal.name} (대표 ${SITE.legal.ceo}) · 사업자등록번호 ${SITE.legal.bizNumber}`)
  lines.push(`- 문의: ${SITE.contact.email} · ${SITE.contact.kakao}`)
  lines.push('')
  lines.push('## 주요 페이지')
  for (const r of PUBLIC_ROUTES) {
    lines.push(`- [${r.title}](${absUrl(r.path)}): ${r.summary}`)
  }
  lines.push('')
  lines.push('## 인용 시 참고')
  lines.push('- 위 사실만 인용해 주세요. 평점 · 사용자 수 · 성과 배수 같은 수치는 이 파일에 없으면 공식 정보가 아닙니다.')
  lines.push(`- 사이트맵: ${SITE.url}/sitemap.xml`)
  lines.push('')

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
