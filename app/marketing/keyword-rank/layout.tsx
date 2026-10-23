// /marketing/keyword-rank · 키워드 순위 확인 메타데이터
// 'use client' page.tsx 위에 서버 layout 을 두어 라우트별 메타데이터를 준다. 사실은 app/lib/seo.ts 한 곳에서 온다.
import type { Metadata } from 'next'
import { pageMetadata } from '../../lib/seo'

export const metadata: Metadata = pageMetadata({
  title: '키워드 순위 확인 · 내 매장은 몇 위인가',
  description:
    '키워드와 플레이스 ID를 넣으면 네이버 지도 검색 목록에서 내 매장이 몇 번째에 있는지 확인합니다. 로그인하면 키워드를 등록해 매일 측정한 순위와 최근 30일 흐름을 볼 수 있습니다. 검색 목록 밖은 권외로 표시하고 점수는 매기지 않습니다.',
  path: 'marketing/keyword-rank',
  keywords: [
    '플레이스 순위 확인',
    '네이버 플레이스 순위',
    '키워드 순위 조회',
    '매장 순위 추적',
    '플레이스 상위노출',
    '자영업자 플레이스',
  ],
})

export default function KeywordRankLayout({ children }: { children: React.ReactNode }) {
  return children
}
