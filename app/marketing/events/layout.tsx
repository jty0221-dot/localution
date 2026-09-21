// /marketing/events · 이벤트 문안 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '이벤트 · 프로모션 문안 생성',
  description:
    '오픈 이벤트, 시즌 프로모션, 단골 감사 이벤트 문안을 업종과 조건만 넣으면 AI 가 씁니다. 인스타 · 카톡 · 매장 안내문에 바로 쓰는 문안 세 종.',
  path: 'marketing/events',
  keywords: [
    '이벤트 문안',
    '프로모션 문구',
    '매장 이벤트 아이디어',
    '오픈 이벤트 문구',
    '자영업자 이벤트',
    '소상공인 프로모션',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
