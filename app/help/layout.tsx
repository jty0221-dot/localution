// /help · 도움말 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '도움말 · 연결 · 답글 · 결제 자주 묻는 질문',
  description:
    '플랫폼 연결, AI 답글 설정, 요금 결제와 해지에 관해 자주 묻는 질문을 모았습니다. 찾는 답이 없으면 카카오 채널로 바로 물어보세요.',
  path: 'help',
  keywords: [
    '로컬루션 도움말',
    '자주 묻는 질문',
    '플랫폼 연결 방법',
    'AI 답글 설정',
    '요금 결제 해지',
    '고객센터',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
