// ═══════════════════════════════════════════════════════════
// app/sitemap.ts
// /sitemap.xml 자동 생성 (Next.js App Router)
// 목록 정본은 app/lib/seo.ts 의 PUBLIC_ROUTES 한 곳이다.
// 로그인 필수 경로(partner-points 등)는 여기 넣지 않는다 :
// 크롤러가 로그인 화면으로 튕기면 사이트 전체 신뢰도가 깎인다.
// ═══════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next'
import { PUBLIC_ROUTES, absUrl } from './lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return PUBLIC_ROUTES.map((r) => ({
    url: absUrl(r.path),
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
}
