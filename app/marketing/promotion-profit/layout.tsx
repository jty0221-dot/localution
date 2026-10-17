import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'
export const metadata: Metadata = pageMetadata({ title: '할인·쿠폰 수익 계산기', description: '행사 전후 매출과 예상 이익을 비교하고 기존 이익을 유지할 판매량을 계산하세요.', path: '/marketing/promotion-profit' })
export default function Layout({ children }: { children: React.ReactNode }) { return children }
