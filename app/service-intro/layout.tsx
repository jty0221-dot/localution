// /service-intro · 서비스 소개 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata, PUBLIC_ROUTES, graphLd, webPageLd, breadcrumbLd } from '../lib/seo'
import JsonLd from '../components/seo/JsonLd'

export const metadata: Metadata = pageMetadata({
  title: '서비스 소개 · 리뷰 답글부터 SNS 발행까지 AI 가 대신',
  description:
    '네이버 · 구글 · 배민 · 요기요 · 쿠팡이츠 · 카카오 리뷰에 AI 가 답글을 달고, 인스타 · 스레드 · 유튜브 커뮤니티 발행과 QR 리뷰 · 플레이스 진단까지. 로컬루션이 사장님 대신 하는 일 전체를 소개합니다.',
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
