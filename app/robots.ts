// ═══════════════════════════════════════════════════════════
// app/robots.ts
// /robots.txt 자동 생성 (Next.js App Router)
// 검색 봇 · AI 봇 · SNS 미리보기 봇 전부 공개 페이지는 허용,
// 로그인 뒤 화면과 API 는 전부 차단. 목록 정본은 app/lib/seo.ts
// ═══════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next'
import { SITE, SEARCH_BOTS, AI_BOTS, SOCIAL_BOTS, PRIVATE_PATHS } from './lib/seo'

export default function robots(): MetadataRoute.Robots {
  const disallow = [...PRIVATE_PATHS]
  const rule = (userAgent: string | string[]) => ({ userAgent, allow: '/', disallow })

  return {
    rules: [
      rule('*'),
      rule([...SEARCH_BOTS]),
      // AI 검색·답변 엔진 : 공개 페이지를 읽어야 AI 답변에 인용된다 (GEO)
      rule([...AI_BOTS]),
      // 카톡 · 페북 · 슬랙 미리보기 : OG 이미지를 가져가야 링크 카드가 뜬다
      rule([...SOCIAL_BOTS]),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
