// /marketing/keyword-score · 키워드 점수 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'
import GatedRoute from '../../components/GatedRoute'

export const metadata: Metadata = pageMetadata({
  title: '키워드 점수 · 경쟁도와 진입 가능성',
  description:
    '키워드마다 검색량 대비 경쟁 문서 수를 점수로 바꿔 내 매장이 들어갈 만한 키워드를 골라 줍니다. 점수가 높은 키워드부터 블로그와 플레이스에 쓰세요.',
  path: 'marketing/keyword-score',
  keywords: [
    '키워드 점수',
    '키워드 경쟁도',
    '키워드 진입 가능성',
    '네이버 키워드 분석',
    '자영업자 키워드',
    '블로그 키워드 선정',
  ],
})

// 요구 모듈: keyword (기존 가드 유지)
export default function KeywordScoreLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="keyword">{children}</GatedRoute>
}
