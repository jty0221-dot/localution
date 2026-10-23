import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'
export const metadata: Metadata = pageMetadata({ title: '순위 이력 분석기', description: '순위 이력 JSON·TSV 파일로 날짜별 순위 변화, 평균 순위와 리뷰 증감을 확인해 보세요.', path: '/marketing/rank-history' })
export default function Layout({ children }: { children: React.ReactNode }) { return children }
