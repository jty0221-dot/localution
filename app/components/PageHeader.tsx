import type { ReactNode } from 'react'
import FeatureGuideLink from './help/FeatureGuideLink'
import { LayoutDashboard } from 'lucide-react'
import type { BrandGradientKey } from '../lib/brand-colors'

export type PageHeaderVariant = BrandGradientKey
export interface PageHeaderProps {
 icon: ReactNode
 title: string
 subtitle?: string
 variant?: PageHeaderVariant
 right?: ReactNode
 badge?: string
 className?: string
 textDark?: boolean
 logoNode?: ReactNode
}

// Variant and textDark remain accepted for existing callers. Headers now share one accessible surface.
export default function PageHeader({ icon, title, subtitle, right, badge = '로컬루션', className = '', logoNode }: PageHeaderProps) {
 const safeIcon = typeof icon === 'string' && /\p{Extended_Pictographic}/u.test(icon)
   ? <LayoutDashboard size={20} strokeWidth={1.8} aria-hidden="true" />
   : icon
 return (
 <section className={`border-b border-[var(--lu-line)] bg-[var(--lu-surface)] text-[var(--lu-ink)] ${className}`}>
 <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-3 px-4 py-4 md:gap-4 md:px-6 md:py-5">
 <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-current">
 {logoNode || safeIcon}
 </div>
 <div className="min-w-0 flex-1 basis-40">
 <h1 className="break-keep text-xl font-semibold leading-7 tracking-tight md:text-2xl md:leading-8">{title}</h1>
 {subtitle && <p className="mt-2 max-w-[68ch] break-keep text-sm leading-6 text-[var(--lu-muted)]">{subtitle}</p>}
 <FeatureGuideLink />
 </div>
 {right ? <div className="flex w-full flex-wrap items-center gap-2 pt-1 md:ml-auto md:w-auto">{right}</div>
 : badge ? <span className="hidden border-l border-[var(--lu-line)] pl-4 text-xs font-medium leading-8 text-[var(--lu-muted)] md:block">{badge}</span> : null}
 </div>
 </section>
 )
}
