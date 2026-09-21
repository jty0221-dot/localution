// /inquiry · 문의하기 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '문의하기 · 도입 · 제휴 · 이용 문의',
  description:
    '도입 상담, 제휴 제안, 이용 중 궁금한 점을 남겨 주세요. 영업일 기준 하루 안에 답합니다.',
  path: 'inquiry',
  keywords: [
    '로컬루션 문의',
    '도입 상담',
    '제휴 문의',
    '고객 문의',
    '자영업자 마케팅 상담',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
