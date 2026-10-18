// /marketing/instagram-feed · 인스타 피드 캡션 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '인스타그램 연결과 사진·릴스 게시',
  description:
    '실제 매장 소식으로 캡션 초안을 작성하고 프로페셔널 계정을 연결하세요. 사진 한 장이나 릴스를 준비하고 직접 게시한 뒤 결과를 확인합니다.',
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
