// /pricing · 요금제 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata, PUBLIC_ROUTES, graphLd, webPageLd, breadcrumbLd } from '../lib/seo'
import JsonLd from '../components/seo/JsonLd'

export const metadata: Metadata = pageMetadata({
  title: '요금제 · 월 6,900원부터 기능 선택형 AI 마케팅',
  description:
    '필요한 기능만 고르는 선택형 요금제. 리뷰 자동 답글 · SNS 자동 포스팅 · AI 매장 진단을 커피 한 잔 값 월 6,900원부터. 1인 사장님 맞춤 플랜.',
  path: 'pricing',
  keywords: [
    '로컬루션 요금제',
    'AI 마케팅 요금',
    '리뷰 답글 자동화 가격',
    '자영업자 마케팅 비용',
    '월 6,900원',
    '기능 선택형 요금제',
  ],
})

const ROUTE = PUBLIC_ROUTES.find((r) => r.path === 'pricing')!

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* GEO : WebPage + BreadcrumbList · 사실은 PUBLIC_ROUTES 한 곳 */}
      <JsonLd data={graphLd([
        webPageLd({ path: ROUTE.path, name: ROUTE.title, description: ROUTE.summary }),
        breadcrumbLd([{ name: '홈', path: '' }, { name: '요금제', path: 'pricing' }]),
      ])} />
      {children}
    </>
  )
}
