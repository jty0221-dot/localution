// /marketing/youtube-community · 유튜브 커뮤니티 발행 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '유튜브 채널 연결과 모바일 영상 업로드',
  description:
    'Google 계정으로 내 채널을 연결하고 휴대전화와 PC에서 영상을 업로드하세요. 공개 범위를 선택하고 실제 업로드 결과를 확인합니다.',
  path: 'marketing/youtube-community',
  keywords: [
    '유튜브 커뮤니티 발행',
    '유튜브 커뮤니티 예약',
    '유튜브 채널 관리',
    '자영업자 유튜브',
    '소상공인 유튜브 마케팅',
  ],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
