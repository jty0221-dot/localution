// ═══════════════════════════════════════════════════════════
// AnswerBlock · AEO/GEO 용 "질문 → 두 문장 답 → 사실 목록" 블록
// AI 답변 엔진은 질문 형태 제목 바로 아래 두 문장을 가장 잘 인용한다.
// 시각 규칙은 로컬루션 기준 : 그라데이션 lucide 아이콘 박스 · rounded-[10px] · shadow-none
// ═══════════════════════════════════════════════════════════

import { MessageCircleQuestion, Check } from 'lucide-react'

type Props = {
  question: string
  answer: string // 두 문장 이내
  facts?: string[]
  className?: string
}

export default function AnswerBlock({ question, answer, facts, className = '' }: Props) {
  return (
    <section
      data-geo="answer"
      className={`bg-white rounded-[10px] border border-[#E8ECF0] shadow-none p-4 md:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
          <MessageCircleQuestion size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-lg font-bold text-[var(--lu-ink)] leading-snug">{question}</h2>
          <p className="mt-2 text-sm md:text-[15px] text-[var(--lu-muted)] leading-relaxed">{answer}</p>
          {facts && facts.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {facts.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#333D4B]">
                  <Check size={14} strokeWidth={2.5} className="mt-[3px] shrink-0 text-[#16685D]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
