// /marketing/card-news · 카드뉴스 제작 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '인스타 카드뉴스 AI 자동 생성기',
  description:
    '주제만 던지면 인스타그램 캐러셀 10장이 1080×1080 PNG 로 즉시 완성되는 자영업자 전용 AI 카드뉴스 제작 도구. 6테마 × 30주제, 바로 다운로드 후 업로드.',
  path: 'marketing/card-news',
  keywords: [
    '인스타 카드뉴스',
    '카드뉴스 AI',
    '인스타 캐러셀',
    '자영업자 인스타',
    '소상공인 인스타 마케팅',
    '인스타 콘텐츠 자동화',
    '1080px 카드뉴스',
    '카드뉴스 템플릿',
    'AI 인포그래픽',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
