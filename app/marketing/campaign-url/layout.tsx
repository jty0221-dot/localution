import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'
export const metadata: Metadata = pageMetadata({ title: 'UTM 홍보 링크 생성기', description: '인스타그램, 네이버 블로그, 카카오 채널에 사용할 홍보 링크를 만들고 유입 경로를 구분해 보세요.', path: '/marketing/campaign-url' })
export default function Layout({ children }: { children: React.ReactNode }) { return children }
