// /marketing/instagram-feed · 인스타 피드 캡션 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '인스타 피드 캡션 생성',
  description:
    '매장 사진과 한 줄 설명만 넣으면 인스타그램 피드 캡션과 해시태그를 AI 가 씁니다. 톤을 고르고 바로 복사해 올리세요.',
  path: 'marketing/instagram-feed',
  keywords: [
    '인스타 캡션 생성',
    '인스타그램 피드 문구',
    '해시태그 추천',
    '자영업자 인스타',
    '소상공인 인스타 마케팅',
    'AI 캡션',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
