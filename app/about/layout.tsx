// /about · 회사 소개 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata, PUBLIC_ROUTES, graphLd, webPageLd, breadcrumbLd } from '../lib/seo'
import JsonLd from '../components/seo/JsonLd'

export const metadata: Metadata = pageMetadata({
  title: '로컬루션 소개 · 자영업자를 위한 마케팅 업무 관리',
  description:
    '흩어진 매장 마케팅 업무를 한곳에서 확인하고 준비하세요. 리뷰 연결 상태 확인, 매장 공지 초안, 행사 비용 비교, 홍보 링크와 기능별 이용 조건을 안내합니다.',
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
