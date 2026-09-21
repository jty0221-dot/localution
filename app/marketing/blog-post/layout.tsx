// /marketing/blog-post · 블로그 글 작성 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'
import GatedRoute from '../../components/GatedRoute'

export const metadata: Metadata = pageMetadata({
  title: '네이버 블로그 AI 초안 생성기',
  description:
    '자영업자 업종 · 키워드만 입력하면 네이버 검색 SEO 최적화된 블로그 초안이 3000자 이내로 즉시 완성. 헤드라인 · 본문 · 해시태그 자동 구성으로 블로그 마케팅 시간 90% 단축.',
  path: 'marketing/blog-post',
  keywords: [
    '네이버 블로그 AI',
    '블로그 초안 생성',
    'AI 블로그 작성',
    '블로그 SEO',
    '자영업자 블로그',
    '소상공인 블로그',
    '블로그 마케팅',
    '네이버 SEO 블로그',
    '블로그 키워드',
  ],
})

// 요구 모듈: blog-ai (기존 가드 유지)
export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="blog-ai">{children}</GatedRoute>
}
