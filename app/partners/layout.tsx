import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'
export const metadata: Metadata = pageMetadata({title: '광고·공공홍보 협업', description: '민간 광고와 공공기관 홍보 협업 문의를 준비하세요.', path: '/partners'})
export default function Layout({children}: {children: React.ReactNode}) {return children}
