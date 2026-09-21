// /marketing/reels · 릴스 대본 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'
import GatedRoute from '../../components/GatedRoute'

export const metadata: Metadata = pageMetadata({
  title: '인스타 릴스 · 쇼츠 대본 AI 자동 작성',
  description:
    '자영업자 매장 후킹 · 홍보 · 메뉴 소개 릴스 대본을 AI 가 30초 안에 5종 생성. 카피라이터 없이도 바로 촬영 가능한 30초 영상 시나리오 + 자막 + 해시태그 자동 제공.',
  path: 'marketing/reels',
  keywords: [
    '인스타 릴스 대본',
    '쇼츠 대본 AI',
    '릴스 자동 생성',
    '자영업자 릴스',
    '소상공인 인스타',
    '맛집 릴스',
    '매장 홍보 영상',
    '인스타 카피',
    'AI 영상 대본',
  ],
})

// 요구 모듈: sns-manage (기존 가드 유지)
export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="sns-manage">{children}</GatedRoute>
}
