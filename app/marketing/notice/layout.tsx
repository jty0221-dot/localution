import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '가게 공지 작성 도우미',
  description: '휴무, 영업시간 변경, 예약, 새 메뉴와 서비스, 이전 공지를 직접 작성하고 복사하거나 텍스트로 내려받으세요. 로그인 없이 브라우저에서 사용할 수 있습니다.',
  path: 'marketing/notice',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
