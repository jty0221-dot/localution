import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '원가·손익분기 계산기',
  description: '판매가, 재료비, 수수료와 월 고정비를 입력하고 개당 공헌이익, 손익분기 판매량과 목표 판매량을 계산해 보세요.',
  path: '/marketing/cost-calculator',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
