// /marketing/threads · 스레드 자동 발행 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '스레드 자동 발행 · 예약 게시',
  description:
    '스레드 계정을 연결하면 글을 예약하고 정해진 시간에 자동으로 올립니다. 매장 소식과 메뉴 이야기를 매일 한 편씩 끊기지 않게.',
  path: 'marketing/threads',
  keywords: [
    '스레드 자동 발행',
    'Threads 예약 게시',
    '스레드 마케팅',
    '자영업자 스레드',
    '소상공인 SNS 자동화',
    '스레드 API 연결',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
