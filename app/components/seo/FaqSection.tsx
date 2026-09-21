// ═══════════════════════════════════════════════════════════
// FaqSection · 화면 FAQ 와 FAQPage JSON-LD 를 같은 배열에서 만든다.
// 화면에 보이는 질문 수와 구조화 데이터 질문 수가 다르면 구글이 FAQ 리치결과를 뺀다.
// 그래서 이 컴포넌트 하나가 둘 다 찍는다.
// ═══════════════════════════════════════════════════════════

import { HelpCircle, ChevronDown } from 'lucide-react'
import JsonLd from './JsonLd'
import { faqPageLd, type FaqItem } from '../../lib/seo'

type Props = {
  items: FaqItem[]
  title?: string
  id?: string
  className?: string
  withJsonLd?: boolean // 상위에서 @graph 에 이미 넣었으면 false
}

export default function FaqSection({ items, title = '자주 묻는 질문', id, className = '', withJsonLd = true }: Props) {
  if (!items.length) return null
  return (
    <section className={className} aria-labelledby={id ? `${id}-title` : undefined}>
      {withJsonLd && <JsonLd data={{ '@context': 'https://schema.org', ...faqPageLd(items) }} />}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-sm flex items-center justify-center">
          <HelpCircle size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <h2 id={id ? `${id}-title` : undefined} className="text-lg md:text-xl font-bold text-[#191F28]">
          {title}
        </h2>
      </div>
      <div className="space-y-2">
        {items.map((f) => (
          <details
            key={f.q}
            className="group bg-white rounded-2xl border border-[#E8ECF0] shadow-sm open:border-[#3182F6]/40"
          >
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 md:px-5 py-3.5 md:py-4 text-sm md:text-[15px] font-semibold text-[#191F28] [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <ChevronDown size={16} strokeWidth={2.5} className="shrink-0 text-[#8B95A1] transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 md:px-5 pb-4 text-sm text-[#4E5968] leading-relaxed">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  )
}
