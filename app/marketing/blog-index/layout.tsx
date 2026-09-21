// /marketing/blog-index · 블로그 지수 조회 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '네이버 블로그 지수 조회 · 분석',
  description:
    '내 블로그 아이디만 넣으면 네이버 블로그 지수와 노출 상태, 최근 글의 검색 반영 여부를 분석합니다. 상위노출을 막는 요인을 한눈에 확인하세요.',
  path: 'marketing/blog-index',
  keywords: [
    '네이버 블로그 지수',
    '블로그 지수 조회',
    '블로그 노출 분석',
    '블로그 저품질 확인',
    '블로그 상위노출',
    '자영업자 블로그',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
