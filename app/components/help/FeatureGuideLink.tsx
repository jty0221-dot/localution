'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CirclePlay } from 'lucide-react'
import { guideForPath, FEATURE_CONDITIONS } from '../../lib/feature-guides'

export default function FeatureGuideLink() {
  const path = usePathname()
  const guide = guideForPath(path)
  if (!guide) return null
  return <div className="mt-2"><Link href={`/help/videos#${guide.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[var(--lu-accent)] hover:bg-[var(--lu-accent-soft)]"><CirclePlay size={17} aria-hidden="true" />사용 순서 영상으로 보기</Link><details className="max-w-2xl text-sm text-[var(--lu-muted)]"><summary className="inline-flex min-h-11 cursor-pointer items-center px-2">준비물과 사용 범위 확인</summary><dl className="space-y-2 rounded-md border border-[var(--lu-line)] bg-[var(--lu-canvas)] p-3"><div><dt className="font-semibold text-[var(--lu-ink)]">준비할 정보</dt><dd className="mt-1 leading-6">{guide.preparation}</dd></div><div><dt className="font-semibold text-[var(--lu-ink)]">확인할 결과</dt><dd className="mt-1 leading-6">{guide.result}</dd></div>{FEATURE_CONDITIONS[guide.id] && <div><dt className="font-semibold text-[var(--lu-ink)]">이용 전에 확인해 주세요</dt><dd className="mt-1 leading-6">{FEATURE_CONDITIONS[guide.id]}</dd></div>}</dl></details></div>
}
