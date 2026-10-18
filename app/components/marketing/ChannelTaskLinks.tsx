import Link from 'next/link'
import { ArrowRight, Camera, MapPin, Video } from 'lucide-react'

const channels = [
  { href: '/marketing/instagram-feed', title: '인스타그램', icon: Camera, description: '캡션을 준비하고 계정 연결 상태를 확인해 사진과 릴스를 게시하세요.', note: '프로페셔널 계정과 게시 권한이 필요해요.' },
  { href: '/marketing/karrot', title: '당근', icon: MapPin, description: '동네 소식을 준비하고 광고 계정을 연결해 캠페인 성과를 조회하세요.', note: '소식 등록과 광고 API 이용 조건을 구분해 안내해요.' },
  { href: '/marketing/youtube-community', title: '유튜브', icon: Video, description: '휴대전화에서도 채널을 연결하고 영상 파일을 업로드하세요.', note: '영상 업로드와 PC 커뮤니티 작업은 이용 방식이 달라요.' },
]

export default function ChannelTaskLinks() {
  return <section aria-labelledby="channel-work-title" className="mb-8 space-y-4">
    <div><h2 id="channel-work-title" className="text-lg font-bold text-[var(--lu-ink)] md:text-xl">채널별 마케팅 작업</h2><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">사용할 채널에서 연결 조건을 확인하고 준비한 콘텐츠를 이어서 작업하세요.</p></div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{channels.map(({ icon: Icon, ...channel }) => <article key={channel.href} className="flex min-w-0 flex-col rounded-[10px] border border-[var(--lu-line)] bg-white p-5">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] text-[var(--lu-accent)]"><Icon size={20} aria-hidden="true" /></span>
      <h3 className="text-base font-bold text-[var(--lu-ink)]">{channel.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">{channel.description}</p><p className="mb-5 mt-3 text-xs leading-5 text-[var(--lu-muted)]">{channel.note}</p>
      <Link href={channel.href} className="mt-auto inline-flex min-h-11 items-center justify-between gap-2 rounded-[6px] bg-[var(--lu-canvas)] px-3 py-2 text-sm font-semibold text-[var(--lu-accent)]">{channel.title} 작업 열기<ArrowRight size={16} aria-hidden="true" /></Link>
    </article>)}</div>
  </section>
}
