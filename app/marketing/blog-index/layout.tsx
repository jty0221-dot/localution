// /marketing/blog-index · 블로그 지수 조회 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '네이버 블로그 지수 조회 · 분석',
  description:
    '내 블로그 아이디만 넣으면 네이버 공개 자료에서 방문자 · 이웃 · 글 수 · 최근 글 날짜를 읽어 보여줍니다. 네이버는 블로그 지수를 공개하지 않아 점수 · 등급은 매기지 않습니다.',
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
