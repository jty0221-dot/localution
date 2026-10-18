import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'
export const metadata: Metadata = pageMetadata({title: '소상공인 지원사업', description: '기업마당과 소상공인24, K-Startup의 공식 지원 안내를 확인하세요. 공고 조회 연결 상태와 지원 대상, 접수기간을 살펴보고 신청은 원문 안내에 따라 진행하세요.', path: '/support'})
export default function Layout({children}: {children: React.ReactNode}) {return children}
