import Link from 'next/link'
import FeatureGuideLink from '../help/FeatureGuideLink'
import { ArrowLeft, ArrowRight } from 'lucide-react'

type ToolId = 'cost-calculator' | 'notice' | 'business-search' | 'campaign-url' | 'promotion-profit'
const tools: Record<ToolId, { href: string; label: string }> = {
  'campaign-url': { href: '/marketing/campaign-url', label: '홍보 링크 만들기' },
  'promotion-profit': { href: '/marketing/promotion-profit', label: '할인 조건 비교하기' },
  'cost-calculator': { href: '/marketing/cost-calculator', label: '원가와 비용 조건 확인하기' },
  notice: { href: '/marketing/notice', label: '공지 문안 준비하기' },
  'business-search': { href: '/marketing/business-search', label: '관련 매장·게시글 살펴보기' },
}
const descriptions: Record<ToolId, string> = {
  'campaign-url': '링크가 만들어졌어요. 연결할 주소와 측정 설정을 확인하세요.',
  'promotion-profit': '실제 비용과 할인 부담 주체를 확인한 뒤 공지 내용을 준비하세요.',
  'cost-calculator': '입력 조건을 확인했다면 실제 판매가와 안내 내용을 정리해보세요.',
  notice: '날짜와 연락 방법을 확인한 뒤 필요한 채널에 직접 붙여넣으세요.',
  'business-search': '출처에서 확인한 내용과 우리 매장의 실제 정보를 구분하고 다음 작업을 준비해보세요.',
}
const related: Record<ToolId, ToolId[]> = {
  'cost-calculator': ['promotion-profit', 'notice'],
  'promotion-profit': ['notice', 'cost-calculator'],
  notice: ['campaign-url', 'business-search'],
  'business-search': ['notice', 'campaign-url'],
  'campaign-url': ['notice', 'business-search'],
}
const linkClass = 'inline-flex min-h-[44px] items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold text-[var(--lu-accent)] hover:bg-[var(--lu-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)]'

export function ToolNavigation() {
  return <div className="mb-5 space-y-2"><nav aria-label="도구 탐색" className="flex flex-wrap gap-2"><Link href="/marketing#marketing-tools" className={linkClass}><ArrowLeft size={16} aria-hidden="true" />마케팅 도구 목록</Link><Link href="/help#find-tools" className={linkClass}>업종별 작업 찾기<ArrowRight size={16} aria-hidden="true" /></Link></nav><FeatureGuideLink /><p className="px-3 text-xs leading-5 text-[var(--lu-muted)]">다른 도구로 이동하면 이 화면의 입력이 유지되지 않을 수 있어요. 필요한 결과를 먼저 저장하거나 복사해 주세요.</p></div>
}

export function ToolNextSteps({ current }: { current: ToolId }) {
  return <section aria-labelledby={`${current}-next-title`} className="mt-6 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-5"><h2 id={`${current}-next-title`} className="text-base font-bold text-[var(--lu-ink)]">다음 작업</h2><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">{descriptions[current]}</p><p className="mt-2 text-xs leading-5 text-[var(--lu-muted)]">다음 도구에서는 필요한 내용을 직접 입력해 주세요.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{related[current].map(id => <Link key={id} href={tools[id].href} className={`${linkClass} justify-between border border-[var(--lu-line)]`}>{tools[id].label}<ArrowRight size={16} className="shrink-0" aria-hidden="true" /></Link>)}</div></section>
}
