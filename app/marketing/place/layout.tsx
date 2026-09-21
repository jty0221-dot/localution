// /marketing/place · 플레이스 진단 메타데이터 (공개 체험 · 가드 없음)
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata, PUBLIC_ROUTES, graphLd, webPageLd, breadcrumbLd } from '../../lib/seo'
import JsonLd from '../../components/seo/JsonLd'

export const metadata: Metadata = pageMetadata({
  title: '네이버 플레이스 진단 · 상위노출',
  description:
    '네이버 플레이스 키워드 진단 · 리뷰수 · 답글률을 한 번에 분석하고 상위노출 체크리스트로 약점을 잡아주는 자영업자 전용 무료 도구. 매장 주소만 입력하면 즉시 결과 제공.',
  path: 'marketing/place',
  keywords: [
    '네이버 플레이스',
    '플레이스 상위노출',
    '플레이스 진단',
    '네이버 지도 상위노출',
    '맛집 상위노출',
    '플레이스 키워드',
    '플레이스 리뷰 관리',
    '플레이스 마케팅',
    '자영업자 마케팅',
  ],
})

const ROUTE = PUBLIC_ROUTES.find((r) => r.path === 'marketing/place')!

export default function PlaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* GEO : WebPage + BreadcrumbList · 사실은 PUBLIC_ROUTES 한 곳 */}
      <JsonLd data={graphLd([
        webPageLd({ path: ROUTE.path, name: ROUTE.title, description: ROUTE.summary }),
        breadcrumbLd([{ name: '홈', path: '' }, { name: '마케팅 도구', path: 'marketing' }, { name: '네이버 플레이스 진단', path: 'marketing/place' }]),
      ])} />
      {children}
    </>
  )
}
