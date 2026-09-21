// ═══════════════════════════════════════════════════════════
// app/manifest.ts
// /manifest.webmanifest 자동 생성 (PWA · 홈 화면 추가 · 추후 TWA/Capacitor 앱 포장)
// public/manifest.json 을 대체한다 (아이콘 경로가 실제 파일과 안 맞았다).
// 아이콘 : public/icons/icon-192.png · icon-512.png · icon-maskable-512.png
// ═══════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next'
import { SITE } from './lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${SITE.name} · 사장님 AI 마케팅`,
    short_name: SITE.name,
    description: SITE.answer,
    lang: SITE.lang,
    dir: 'ltr',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: SITE.backgroundColor,
    theme_color: SITE.themeColor,
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '리뷰 관리', short_name: '리뷰', url: '/review-admin', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: '대시보드', short_name: '홈', url: '/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: '플레이스 진단', short_name: '진단', url: '/marketing/place', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
