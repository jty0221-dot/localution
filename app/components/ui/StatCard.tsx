// app/components/ui/StatCard.tsx
// ============================================================
// KPI 카드 — 대시보드·모니터링 상단 요약에 쓰는 표준 카드
//
// AdRank 의 "내 플레이스 요약" 4카드와 같은 역할.
// 숫자는 tabular-nums 로 고정폭 정렬해 카드끼리 자릿수가 흔들리지 않게 한다.
// (이 디테일이 없으면 값이 갱신될 때마다 숫자가 미세하게 움직여 어수선해 보인다.)
// ============================================================
import type { LucideIcon } from 'lucide-react'
import IconBadge, { type IconBadgeTone } from './IconBadge'

export default function StatCard({
  icon,
  tone = 'primary',
  label,
  value,
  unit,
  badge,
  caption,
  onClick,
}: {
  icon: LucideIcon
  tone?: IconBadgeTone
  /** 카드 제목 (예: "TOP5 키워드") */
  label: string
  /** 대표 숫자 */
  value: string | number
  /** 단위 (예: "개", "%") */
  unit?: string
  /** 우측 상단 보조 배지 (예: "진입률 42.9%") */
  badge?: string
  /** 하단 설명 (예: "전체 키워드 21개 중") */
  caption?: string
  onClick?: () => void
}) {
  const clickable = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={
        'bg-white rounded-[10px] border border-[#D5DEDC] shadow-none p-4 transition-colors ' +
        (clickable ? 'cursor-pointer hover:border-[#16685D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16685D]' : '')
      }
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[12px] font-semibold text-[#53656A]">{label}</span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F3F5F4] text-[#53656A] whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <IconBadge icon={icon} tone={tone} size="md" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[28px] font-semibold text-[#172B2F] tabular-nums leading-none">
              {value}
            </span>
            {unit && <span className="text-[13px] font-bold text-[#53656A]">{unit}</span>}
          </div>
          {caption && (
            <div className="text-[11px] text-[#53656A] mt-1 break-words">{caption}</div>
          )}
        </div>
      </div>
    </div>
  )
}
