'use client'

// ============================================================
// DashboardRightSidebar — 대시보드 우측 사이드바
//   · xl 이상 (1280px+): 우측 컬럼에 sticky 로 표시
//   · xl 미만: 메인 콘텐츠 하단에 일반 흐름으로 표시 (스크롤 시 나타남)
//
//   [주의] DO_NOT_TOUCH:
//     - QuickActions 추가 금지 (/DO_NOT_TOUCH.md)
//     - 부모는 xl:grid xl:grid-cols-[1fr_280px] 로 공간 분배 (콘텐츠 침범 방지)
// ============================================================
import Link from 'next/link'
import {
  ArrowRight, BellRing, HelpCircle, Mail, Sparkles, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'

// 실제 이용 집계가 연결되기 전에는 인기 순위를 만들지 않는다.
function ServiceRankingMini() {
 return <section className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4">
 <h3 className="text-sm font-semibold text-[var(--lu-ink)]">서비스 이용 안내</h3>
 <p className="mt-2 text-xs leading-5 text-[var(--lu-muted)]">인기 서비스 순위는 이용 집계가 연결된 뒤 안내합니다.</p>
 <Link href="/marketing" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">사용할 도구 찾기<ArrowRight size={15} /></Link>
 </section>
}

// 사이드바 카드 3종 (재사용 — desktop sticky / mobile inline 양쪽에 동일하게 사용)
function SidebarCards() {
  return (
    <>
      {/* 1) 인기 서비스 TOP 10 */}
      <ServiceRankingMini />

      {/* 2) 리뷰 알림 연결 안내 */}
      <div className="rounded-[10px] bg-white border border-[var(--lu-line)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <BellRing size={16} className="text-[var(--lu-accent)]" strokeWidth={2.5} />
          <h3 className="text-[14px] font-bold text-[var(--lu-muted)]">리뷰 알림 연결 안내</h3>
        </div>
        <p className="text-[12px] text-[var(--lu-muted)] leading-relaxed">
          리뷰 계정을 연결한 뒤 수집 상태와 알림 설정을 확인하세요.
        </p>
      </div>

      {/* 3) 도움이 필요하세요? */}
      <div className="bg-white rounded-[10px] shadow-none p-4">
        <h3 className="text-[14px] font-bold text-[var(--lu-ink)] mb-2.5">도움이 필요하세요?</h3>
        <div className="space-y-1">
          <Link href="/help"
            className="flex min-h-11 items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-[#FAFBFF] text-[13px] font-bold text-[var(--lu-muted)] transition-colors">
            <HelpCircle size={15} className="text-[#16685D]" strokeWidth={2.5} />
            <span>도움말 · 가이드</span>
            <ArrowRight size={12} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
          </Link>
          <Link href="/inquiry"
            className="flex min-h-11 items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-[#FAFBFF] text-[13px] font-bold text-[var(--lu-muted)] transition-colors">
            <Mail size={15} className="text-[#7C3AED]" strokeWidth={2.5} />
            <span>1:1 문의</span>
            <ArrowRight size={12} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
          </Link>
          <Link href="/updates"
            className="flex min-h-11 items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-[#FAFBFF] text-[13px] font-bold text-[var(--lu-muted)] transition-colors">
            <Sparkles size={15} className="text-[#EC4899]" strokeWidth={2.5} />
            <span>업데이트 내역</span>
            <ArrowRight size={12} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </>
  )
}

// 데스크톱 (xl+, 1280px+): position:fixed 로 viewport 우측에 항상 고정 (스크롤 따라옴)
//   · sticky 가 부모 grid context 영향으로 초기 위치에서 안 따라오는 문제 회피
//   · main 에 xl:pr-[336px] 로 콘텐츠 침범 방지 (sidebar 320 + 16 margin)
//   · 하랑마케팅 팝업 (z-40) 이 우측 하단을 덮을 수 있어 사이드바 bottom 24rem 확보
//
// [주의] DO_NOT_TOUCH:
//   · sticky 로 변경 X (위 이슈 재현됨)
//   · 카드 3개 순서 그대로 (TOP10 → 알림 → 도움말)
export default function DashboardRightSidebar() {
  return (
    <div
      className="hidden 2xl:block fixed top-20 right-4 w-[280px] z-30 space-y-3.5"
      style={{
        bottom: '1rem',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <SidebarCards />
      {/* 팝업 영역 확보 — 마지막 카드 아래 240px 공간 */}
      <div className="h-[240px]" aria-hidden />
    </div>
  )
}

// xl 미만 (1280px 미만): 메인 콘텐츠 하단에 인라인 표시 (lg+ 3열, mobile 1열)
export function DashboardRightSidebarMobile() {
  return (
    <div className="2xl:hidden mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <SidebarCards />
      </div>
    </div>
  )
}
