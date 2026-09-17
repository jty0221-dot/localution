// app/components/landing/ProductPreview.tsx
// ============================================================
// 랜딩 히어로 제품 미리보기
//
// 왜 만들었나:
//   랜딩 페이지에 이미지가 단 한 장도 없었다 (<img> 0개, next/image 0개).
//   전부 추상적인 카드·애니메이션이라 사장님이 "이 제품이 실제로
//   어떻게 생겼는지" 볼 수 없었다. SaaS 랜딩에서 전환율을 가장 크게
//   깎는 요인이다.
//
// 왜 스크린샷 이미지가 아니라 HTML 목업인가:
//   1) 항상 정확 — 실제 UI 가 바뀌어도 캡처를 다시 뜰 필요가 없다
//   2) 고해상도에서 선명 — 래스터 이미지는 레티나에서 뭉갠다
//   3) 가볍다 — 수백 KB 이미지 대신 마크업 몇 KB
//   4) 접근성 — 스크린리더가 읽을 수 있고 텍스트 확대에 대응
//
// 표시되는 수치는 UI 구조를 보여주기 위한 예시다.
// 사용자 수·성과를 지어내는 값은 쓰지 않는다.
// ============================================================
import { Store, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Row = {
  date: string
  rank: number
  delta: number // 전일 대비 (음수 = 순위 상승)
  blog: number
  visitor: number
  score: number
}

/** UI 구조 설명용 예시 데이터 — 실제 사용자 성과가 아니다 */
const ROWS: Row[] = [
  { date: '08.19', rank: 3, delta: -1, blog: 1702, visitor: 203, score: 41.2 },
  { date: '08.18', rank: 4, delta: 0, blog: 1702, visitor: 201, score: 40.8 },
  { date: '08.17', rank: 4, delta: -2, blog: 1698, visitor: 198, score: 40.5 },
  { date: '08.16', rank: 6, delta: 1, blog: 1695, visitor: 195, score: 39.1 },
]

function RankCell({ rank, delta }: { rank: number; delta: number }) {
  const tone =
    rank <= 3
      ? { bg: '#EFF6FF', text: '#3182F6' }
      : rank <= 5
        ? { bg: '#ECFDF5', text: '#059669' }
        : { bg: '#FFFBEB', text: '#F59E0B' }

  return (
    <div className="flex items-center justify-center gap-1">
      <span
        className="px-2 py-0.5 rounded-lg text-[11px] font-bold tabular-nums"
        style={{ background: tone.bg, color: tone.text }}
      >
        {rank}위
      </span>
      {delta === 0 ? (
        <Minus size={10} strokeWidth={3} className="text-[#C3CAD1]" />
      ) : delta < 0 ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#059669] tabular-nums">
          <TrendingUp size={10} strokeWidth={3} />
          {Math.abs(delta)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#DC2626] tabular-nums">
          <TrendingDown size={10} strokeWidth={3} />
          {delta}
        </span>
      )}
    </div>
  )
}

export default function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* 바닥 그림자 — 화면이 떠 있는 느낌 */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-10 rounded-full blur-2xl opacity-25"
        style={{ background: '#3182F6' }}
        aria-hidden="true"
      />

      <figure className="relative rounded-2xl border border-[#E5E8EB] bg-white shadow-xl shadow-blue-100/60 overflow-hidden">
        {/* 브라우저 크롬 */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F8F9FA] border-b border-[#E5E8EB]">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 mx-2">
            <div className="mx-auto max-w-[280px] rounded-md bg-white border border-[#E5E8EB] px-3 py-1 text-[10px] text-[#8B95A1] text-center truncate">
              localution.co.kr / 플레이스 모니터링
            </div>
          </div>
        </div>

        {/* 화면 본문 */}
        <div className="p-4 md:p-5 bg-[#F8F9FA]">
          <div className="rounded-xl bg-white border border-[#E5E8EB] shadow-sm overflow-hidden text-left">
            {/* 매장 헤더 */}
            <div className="flex items-start gap-3 p-3.5 border-b border-[#F2F4F6]">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] shadow-sm flex items-center justify-center flex-shrink-0">
                <Store size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#191F28] text-[13px]">우리동네 카페</span>
                  <ExternalLink size={11} strokeWidth={2.5} className="text-[#8B95A1]" />
                </div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">카페 · 경기 부천시</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3182F6]">
                <RefreshCw size={10} strokeWidth={3} />
                새로고침
              </span>
            </div>

            {/* 키워드 칩 */}
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#F2F4F6] flex-wrap">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]">
                부천 카페 <span className="opacity-70">3위</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-[#E5E8EB] text-[#4E5968]">
                상동 디저트 <span className="opacity-70">7위</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-[#E5E8EB] text-[#4E5968]">
                부천 브런치 <span className="opacity-70">12위</span>
              </span>
            </div>

            {/* 7일 표 */}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#FAFBFC] text-[#8B95A1]">
                  <th className="text-left font-semibold px-3.5 py-1.5">일자</th>
                  <th className="text-center font-semibold px-2 py-1.5">순위</th>
                  <th className="text-right font-semibold px-2 py-1.5">블로그</th>
                  <th className="text-right font-semibold px-2 py-1.5">방문자</th>
                  <th className="text-right font-semibold px-3.5 py-1.5">점수</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(r => (
                  <tr key={r.date} className="border-t border-[#F2F4F6]">
                    <td className="px-3.5 py-1.5 text-[#4E5968] tabular-nums">{r.date}</td>
                    <td className="px-2 py-1.5">
                      <RankCell rank={r.rank} delta={r.delta} />
                    </td>
                    <td className="px-2 py-1.5 text-right text-[#4E5968] tabular-nums">
                      {r.blog.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-2 py-1.5 text-right text-[#4E5968] tabular-nums">
                      {r.visitor}
                    </td>
                    <td className="px-3.5 py-1.5 text-right font-bold text-[#191F28] tabular-nums">
                      {r.score.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <figcaption className="sr-only">
          로컬루션 플레이스 모니터링 화면 예시. 매장별로 등록한 키워드의 네이버 검색 순위와
          블로그·방문자 리뷰 수, 노출 점수를 날짜별로 보여줍니다.
        </figcaption>
      </figure>

      <p className="text-[11px] text-[#8B95A1] text-center mt-8">
        실제 화면 구성 · 표시된 수치는 예시입니다
      </p>
    </div>
  )
}
