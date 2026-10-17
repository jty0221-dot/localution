// app/components/ui/IconBadge.tsx
// 단색 상태 아이콘 배지. 청록 업무 보드의 의미 색상과 작은 아이콘 크기를 공유한다.
// 기존 tone/size/ring props는 유지하며 장식 그라데이션을 사용하지 않는다.
import type { LucideIcon } from 'lucide-react'

export type IconBadgeTone =
  | 'primary'   // 블루 · 기본
  | 'accent'    // 퍼플 · AI·스마트 기능
  | 'success'   // 그린 · 긍정·완료
  | 'warn'      // 앰버 · 주의
  | 'danger'    // 레드 · 경고·오류
  | 'neutral'   // 그레이 · 비활성

export type IconBadgeSize = 'sm' | 'md' | 'lg'

const TONE_CLASS: Record<IconBadgeTone, string> = {
 primary: 'bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] ring-[var(--lu-line)]',
 accent: 'bg-[#EEEBF5] text-[#65547D] ring-[#DAD3E4]',
 success: 'bg-[var(--lu-success-soft)] text-[var(--lu-success)] ring-[var(--lu-line)]',
 warn: 'bg-[var(--lu-warning-soft)] text-[var(--lu-warning)] ring-[var(--lu-line)]',
 danger: 'bg-[var(--lu-danger-soft)] text-[var(--lu-danger)] ring-[var(--lu-line)]',
 neutral: 'bg-[var(--lu-canvas)] text-[var(--lu-muted)] ring-[var(--lu-line)]',
}

const SIZE_CLASS: Record<IconBadgeSize, { box: string; icon: number }> = {
  sm: { box: 'w-7 h-7 rounded-lg', icon: 13 },
  md: { box: 'w-8 h-8 rounded-md', icon: 16 },
  lg: { box: 'w-10 h-10 rounded-md', icon: 19 },
}

export default function IconBadge({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  ring = false,
  className = '',
}: {
  icon: LucideIcon
  tone?: IconBadgeTone
  size?: IconBadgeSize
  /** 은은한 링 추가 — 밝은 배경 위에서 경계를 살릴 때 */
  ring?: boolean
  className?: string
}) {
  const s = SIZE_CLASS[size]
  return (
    <div
      className={[
        s.box,
        TONE_CLASS[tone],
        'flex items-center justify-center flex-shrink-0 shadow-none',
        ring ? 'ring-1' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon size={s.icon} className="text-current" strokeWidth={1.8} />
    </div>
  )
}
