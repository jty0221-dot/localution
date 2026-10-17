import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'
export const metadata: Metadata = pageMetadata({title: '소상공인 지원사업', description: '기업마당 공고와 소상공인 공식 지원 안내를 확인하세요.', path: '/support'})
export default function Layout({children}: {children: React.ReactNode}) {return children}
