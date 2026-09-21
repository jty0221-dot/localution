// /marketing/naver-ads · 키워드 조회 · 분석 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '키워드 조회 · 분석 · 검색량과 콘텐츠 포화도',
  description:
    '키워드별 월간 검색량 · 트렌드 · 콘텐츠 포화도를 한 화면에서 봅니다. 내 매장에 맞는 지역 키워드와 연관 키워드를 찾아 블로그와 플레이스에 쓰세요.',
  path: 'marketing/naver-ads',
  keywords: [
    '키워드 검색량 조회',
    '네이버 키워드 분석',
    '연관 키워드',
    '키워드 포화도',
    '지역 키워드',
    '자영업자 키워드',
    '플레이스 키워드',
    '블로그 키워드',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
