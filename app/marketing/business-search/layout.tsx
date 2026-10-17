import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
 title: '매장·콘텐츠 검색',
 description: '지역과 업종에 맞는 매장, 네이버 블로그와 카페 글을 검색하고 출처를 확인해보세요.',
 path: 'marketing/business-search',
})
export default function Layout({ children }: { children: React.ReactNode }) { return children }
