// /qr · /qr-admin(로그인 필요) 으로 바로 넘기는 페이지. 공개 랜딩이 아니므로 색인하지 않는다.
// 사실은 app/lib/seo.ts 한 곳에서 온다. QR 리뷰 소개는 /service-intro 가 맡는다.
import type { Metadata } from 'next'
import { pageMetadata } from '../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'QR 리뷰 관리로 이동',
  description: 'QR 리뷰 관리 화면으로 이동합니다.',
  path: 'qr',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
