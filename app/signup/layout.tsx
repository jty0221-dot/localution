// /signup · 회원가입 메타데이터 (OAuth 리다이렉트 · 색인 제외)
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '회원가입 · 월 6,900원 자영업자 AI 마케팅 시작',
  description:
    '네이버 · 배민 · 요기요 · 쿠팡이츠 리뷰 자동 답글과 인스타 · 유튜브 자동화를 커피 한 잔 값 월 6,900원으로. 네이버 · 카카오 계정으로 바로 가입.',
  path: 'signup',
  keywords: [
    '로컬루션 회원가입',
    '자영업자 AI 마케팅 가입',
  ],
  noIndex: true,
})

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
