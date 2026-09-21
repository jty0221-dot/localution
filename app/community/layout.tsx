// /community · 사장님 커뮤니티 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '사장님 커뮤니티 · 지역별 정보 나눔',
  description:
    '같은 지역 사장님들이 마케팅 · 배달 · 인력 · 정부지원 정보를 나누는 게시판입니다. 내 동네 글부터 먼저 봅니다.',
  path: 'community',
  keywords: [
    '사장님 커뮤니티',
    '자영업자 커뮤니티',
    '소상공인 정보 공유',
    '지역 사장님 모임',
    '자영업 정보 게시판',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
