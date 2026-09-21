// /marketing · 마케팅 도구 허브 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '마케팅 도구 · 플레이스 진단 · 키워드 · 블로그 · 릴스',
  description:
    '네이버 플레이스 진단, 키워드 검색량 조회, 블로그 글 작성, 릴스 대본, 카드뉴스, 순위 추적까지. 자영업자가 바로 써 보는 AI 마케팅 도구 모음.',
  path: 'marketing',
  keywords: [
    '자영업자 마케팅 도구',
    'AI 마케팅 도구',
    '플레이스 진단',
    '키워드 조회',
    '블로그 글 작성',
    '릴스 대본',
    '카드뉴스 제작',
    '소상공인 마케팅',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
