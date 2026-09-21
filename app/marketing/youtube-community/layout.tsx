// /marketing/youtube-community · 유튜브 커뮤니티 발행 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '유튜브 커뮤니티 자동 발행',
  description:
    '유튜브 채널의 커뮤니티 탭 게시글을 예약하고 자동으로 올립니다. 영상이 없는 날에도 채널이 살아 있게 유지하세요.',
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
