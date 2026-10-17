import Link from 'next/link'
import TopNav from '../../components/TopNav'
import Footer from '../../components/Footer'
import AnswerBlock from '../../components/seo/AnswerBlock'
import WorkflowMotion from '../../components/help/WorkflowMotion'
import FeatureVideoLibrary from '../../components/help/FeatureVideoLibrary'
import { pageMetadata } from '../../lib/seo'

export const metadata = pageMetadata({ title: '기능별 설명 영상과 사용 순서', description: '로컬루션의 홍보 링크, 공지, 원가 계산, 리뷰와 고객 관리 기능을 영상과 단계별 안내로 확인하세요.', path: '/help/videos' })

export default function FeatureVideosPage() {
  return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]"><TopNav /><main className="pt-16"><header className="mx-auto max-w-6xl px-4 pb-4 pt-10 md:px-6"><Link href="/help" className="inline-flex min-h-11 items-center text-sm text-[var(--lu-accent)]">도움말로 돌아가기</Link><h1 className="mt-4 text-3xl font-semibold md:text-4xl">보고 나면, 시작이 쉬워져요.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[var(--lu-muted)]">기능별 준비물과 입력·확인·활용 순서를 영상으로 살펴보세요. 외부 연결이 필요한 기능은 로그인과 수집 상태를 먼저 확인해 주세요.</p></header><WorkflowMotion /><section className="mx-auto max-w-6xl px-4 pb-16 md:px-6" aria-label="기능별 영상과 단계별 설명"><FeatureVideoLibrary /><div className="mt-8"><AnswerBlock question="영상을 보면 바로 기능을 사용할 수 있나요?" answer="계산·공지·홍보 링크는 정보를 넣고 바로 사용할 수 있어요. 외부 플랫폼을 사용하는 기능은 계정과 연결 상태, 실제 조회 결과를 먼저 확인해 주세요." facts={["영상은 사용 순서를 설명하는 안내이며 실시간 수집 성공 증거가 아니에요.", "입력한 비용과 날짜, 생성된 문구는 직접 확인해 주세요."]} /></div></section></main><Footer /></div>
}
