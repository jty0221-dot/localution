// /updates · 업데이트 소식 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '업데이트 소식 · 새 기능과 변경 사항',
  description:
    '로컬루션에 새로 들어온 기능과 바뀐 점을 날짜순으로 정리합니다. 리뷰 답글 · SNS 발행 · 진단 도구의 변경 이력을 확인하세요.',
  path: 'updates',
  keywords: [
    '로컬루션 업데이트',
    '새 기능',
    '변경 사항',
    '릴리스 노트',
    '서비스 소식',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
