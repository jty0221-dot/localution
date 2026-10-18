import type { Metadata } from 'next'
export const metadata: Metadata = { title: '당근 소식 준비 | 로컬루션', description: '소식 원고와 사진을 준비하고 당근 비즈프로필에서 게시를 이어가세요.' }
export default function Layout({ children }: { children: React.ReactNode }) { return children }
