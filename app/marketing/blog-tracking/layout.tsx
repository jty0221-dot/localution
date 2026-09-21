// /marketing/blog-tracking · 블로그 순위 추적 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '블로그 순위 자동 추적',
  description:
    '네이버 검색 상위노출 · 스마트블록 · 인플루언서 포함 영역까지 매일 자동 모니터링. 키워드별 노출 변동을 한눈에 확인하고 이탈 시 카카오톡 알림으로 즉시 대응하는 자영업자 전용 블로그 순위 추적기.',
  path: 'marketing/blog-tracking',
  keywords: [
    '블로그 순위 추적',
    '네이버 블로그 순위',
    '스마트블록 순위',
    '네이버 상위노출',
    '인플루언서 블로그',
    '블로그 키워드 모니터링',
    '블로그 순위 변동 알림',
    '자영업자 블로그 마케팅',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
