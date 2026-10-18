import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'
export const metadata: Metadata = pageMetadata({title: '광고·공공홍보 협업', description: '로컬루션의 민간 제휴광고와 공공기관 홍보 협업 범위를 확인하세요. 목적과 대상, 일정 등 제안 내용을 정리해 문의 초안을 준비하고 공식 정보와 유료 광고를 구분하세요.', path: '/partners'})
export default function Layout({children}: {children: React.ReactNode}) {return children}
