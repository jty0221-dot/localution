import { redirect } from 'next/navigation'
import { buildReviewsRedirect } from '../lib/review-inbox'

// LU-018 W2-9 · 옛 주소 /reviews → 통합 리뷰 수신함(/review-admin)
// 대시보드 '미답변 N건 검토' 는 /reviews?filter=unanswered 로 오므로 쿼리를 그대로 넘긴다.
export default async function Reviews({
 searchParams,
}: {
 searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
 redirect(buildReviewsRedirect(await searchParams))
}
