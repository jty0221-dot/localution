// /service-intro · 서비스 소개 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata, PUBLIC_ROUTES, graphLd, webPageLd, breadcrumbLd } from '../lib/seo'
import JsonLd from '../components/seo/JsonLd'

export const metadata: Metadata = pageMetadata({
  title: '서비스 소개 · 매장 마케팅 통합 관리',
  description:
    '공지 작성, 홍보 링크 생성과 원가 계산부터 연결된 계정의 리뷰·콘텐츠 관리까지. 필요한 자료와 계정 권한, 기능별 이용 조건을 확인하고 내 가게에 필요한 업무를 시작하세요.',
  path: 'service-intro',
  keywords: [
    '로컬루션 서비스 소개',
    'AI 리뷰 답글',
    '리뷰 자동 답글',
    'SNS 자동 발행',
    'QR 리뷰',
    '플레이스 진단',
    '자영업자 마케팅 자동화',
    '소상공인 AI 마케팅',
  ],
})

const ROUTE = PUBLIC_ROUTES.find((r) => r.path === 'service-intro')!

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* GEO : WebPage + BreadcrumbList · 사실은 PUBLIC_ROUTES 한 곳 */}
      <JsonLd data={graphLd([
        webPageLd({ path: ROUTE.path, name: ROUTE.title, description: ROUTE.summary }),
        breadcrumbLd([{ name: '홈', path: '' }, { name: '서비스 소개', path: 'service-intro' }]),
      ])} />
      {children}
    </>
  )
}
