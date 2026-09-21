// /login · 로그인 메타데이터 (색인 제외)
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '로그인',
  description:
    '네이버 · 카카오 · 구글 간편 로그인으로 내 매장 AI 마케팅 대시보드에 접속하세요.',
  path: 'login',
  keywords: [
    '로컬루션 로그인',
  ],
  noIndex: true,
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
