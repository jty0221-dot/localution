import Link from 'next/link'
import TopNav from '../components/TopNav'
import Footer from '../components/Footer'
import OwnerStoryPlayer from '../components/landing/OwnerStoryPlayer'
import JsonLd from '../components/seo/JsonLd'
import { absUrl, breadcrumbLd, graphLd, pageMetadata, webPageLd } from '../lib/seo'

const title = '가게 문을 닫아도 끝나지 않는 하루'
const description = '마감 뒤에도 리뷰와 내일의 홍보를 챙기는 사장님의 하루를 로컬루션 브랜드 영상으로 만나보세요. 흩어진 마케팅 업무를 한곳에서 확인하고 준비하는 사용 흐름을 소개합니다.'

export const metadata = pageMetadata({ title, description, path: '/story' })

export default function OwnerStoryPage() {
  return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]">
    <TopNav />
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 md:px-6">
      <JsonLd data={graphLd([
        { ...webPageLd({ path: '/story', name: title, description }), mainEntity: { '@id': absUrl('/story#film') } },
        breadcrumbLd([{ name: '홈', path: '/' }, { name: '브랜드 영상', path: '/story' }]),
        {
          '@type': 'VideoObject', '@id': absUrl('/story#film'), name: title, description,
          thumbnailUrl: absUrl('/hero/owner-story-v2-20261018/owner-poster.jpg'),
          contentUrl: absUrl('/hero/owner-story-v2-20261018/owner-story.mp4'),
          uploadDate: '2026-10-18', duration: 'PT45S', inLanguage: 'ko',
        },
      ])} />
      <nav aria-label="현재 위치" className="mb-5 flex flex-wrap gap-2 text-sm text-[var(--lu-muted)]"><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/">홈</Link><span className="inline-flex min-h-11 items-center" aria-hidden="true">·</span><span className="inline-flex min-h-11 items-center" aria-current="page">브랜드 영상</span></nav>
      <header className="mb-6 max-w-3xl"><p className="text-sm font-semibold text-[var(--lu-accent)]">로컬루션 브랜드 필름</p><h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{title}</h1><p className="mt-4 text-base leading-7 text-[var(--lu-muted)]">손님을 맞이하고, 가게를 정리하고, 휴대폰을 켜면 또 다른 일이 시작되죠. 리뷰와 콘텐츠, 내일의 홍보까지 챙겨야 하는 사장님의 하루에서 시작했습니다.</p></header>
      <OwnerStoryPlayer />
      <section aria-labelledby="story-about" className="mt-8 max-w-3xl rounded-[10px] border border-[var(--lu-line)] bg-white p-5 md:p-7">
        <h2 id="story-about" className="text-xl font-semibold">사장님의 시간을, 다시 가게로</h2>
        <p className="mt-4 leading-7 text-[var(--lu-muted)]">로컬루션은 여러 곳에 흩어진 마케팅 업무를 한곳에서 관리하도록 돕는 서비스입니다. 연결된 매장의 리뷰와 처리 상태를 확인하고, 공지 문안과 홍보 링크를 준비하고, 행사 비용을 비교할 수 있어요.</p>
        <p className="mt-3 leading-7 text-[var(--lu-muted)]">외부 플랫폼의 데이터 조회와 발행은 계정 권한과 연결 상태에 따라 달라요. 먼저 연결과 실제 조회 결과를 확인한 뒤 사용해 주세요.</p>
        <p className="mt-4 text-sm leading-6 text-[var(--lu-muted)]">영상 속 인물과 가게는 AI로 연출한 상황이며 실제 고객 사례가 아닙니다. 기능 화면은 공개된 서비스의 사용 흐름을 소개합니다.</p>
      </section>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-md bg-[var(--lu-accent)] px-5 font-semibold text-white">우리 가게 관리 시작하기</Link><Link href="/help/videos" className="inline-flex min-h-11 items-center rounded-md border border-[var(--lu-line)] px-5 font-semibold">기능별 사용 영상 보기</Link></div>
    </main>
    <Footer />
  </div>
}
