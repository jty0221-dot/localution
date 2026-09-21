// /about · 회사 소개 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata, PUBLIC_ROUTES, graphLd, webPageLd, breadcrumbLd } from '../lib/seo'
import JsonLd from '../components/seo/JsonLd'

export const metadata: Metadata = pageMetadata({
  title: '로컬루션 소개 · 자영업자를 위한 AI 마케팅 OS',
  description:
    '리뷰 답글 · SNS 운영 · 광고 집행을 AI 가 자동으로. 500곳 매장 데이터를 학습한 로컬루션, 커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰 답글.',
  path: 'about',
  keywords: [
    '로컬루션 소개',
    '자영업자 AI 마케팅',
    '소상공인 마케팅 OS',
    'AI 리뷰 답글',
    '하랑마케팅',
  ],
})

const ROUTE = PUBLIC_ROUTES.find((r) => r.path === 'about')!

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* GEO : WebPage + BreadcrumbList · 사실은 PUBLIC_ROUTES 한 곳 */}
      <JsonLd data={graphLd([
        webPageLd({ path: ROUTE.path, name: ROUTE.title, description: ROUTE.summary }),
        breadcrumbLd([{ name: '홈', path: '' }, { name: '회사 소개', path: 'about' }]),
      ])} />
      {children}
    </>
  )
}
