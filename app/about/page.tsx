"use client"
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import TopNav from '../components/TopNav'
import Footer from '../components/Footer'
import { ArrowRight, MessageSquare, FileText, Calculator, Link2, CheckCircle2 } from 'lucide-react'
const TASKS = [
 { Icon: MessageSquare, title: '리뷰 확인', text: '연결한 계정의 수집 상태와 최근 리뷰를 확인합니다. 답글 초안과 실제 등록 결과는 따로 확인합니다.', href: '/dashboard' },
 { Icon: FileText, title: '매장 공지 준비', text: '휴무와 운영 변경, 행사 조건을 입력해 고객에게 전할 공지 초안을 준비합니다.', href: '/marketing/notice' },
 { Icon: Calculator, title: '행사 비용 비교', text: '실제 메뉴 가격과 비용을 입력하고 할인 행사 조건을 비교합니다.', href: '/marketing' },
 { Icon: Link2, title: '홍보 링크 만들기', text: '채널별 홍보 링크를 만들고 입력한 주소와 추적 조건을 확인합니다.', href: '/marketing/campaign-url' },
]
const PRINCIPLES = [
 { title: '실제 자료로 확인하기', text: '자료가 없거나 조회에 실패하면 확인 필요 상태로 안내합니다. 예시 수치를 운영 결과로 보여주지 않습니다.' },
 { title: '준비와 실행 구분하기', text: '초안 작성과 복사, 서버 저장, 외부 게시의 단계를 나누어 확인합니다.' },
 { title: '연결 상태 먼저 확인하기', text: '계정 연결과 조회 권한, 마지막 수집 결과를 확인한 뒤 해당 자료를 사용합니다.' },
 { title: '사장님 판단 남겨두기', text: '금액과 날짜, 안내 문구를 확인하고 고객에게 전달할 내용을 결정합니다.' },
 { title: '실패한 작업 다시 확인하기', text: '처리 실패나 수동 등록이 필요한 작업을 완료한 결과와 구분합니다.' },
]
const FAQ = [
 { q: '어떤 일부터 시작하면 되나요?', a: '매장 공지나 홍보 링크처럼 직접 조건을 입력하는 도구부터 사용할 수 있습니다. 리뷰 등 계정 자료를 사용하는 기능은 연결 상태와 실제 수집 결과를 먼저 확인해주세요.' },
 { q: '모든 채널이 자동으로 게시되나요?', a: '기능과 플랫폼마다 연결 조건과 실행 범위가 다릅니다. 초안 준비, 복사, 직접 등록, 연결 계정 실행을 구분하고 실제 게시 결과를 확인해야 합니다.' },
 { q: '요금과 이용 조건은 어디에서 확인하나요?', a: '요금제 페이지에서 모듈별 가격과 이용 조건을 확인할 수 있습니다. 결제수단 등록과 실제 구독 권한은 별도로 확인합니다.' },
 { q: '휴대폰에서도 사용할 수 있나요?', a: '모바일 브라우저에서도 같은 사이트에 접속할 수 있습니다. 플랫폼 연결이나 외부 등록 과정은 해당 플랫폼의 권한과 화면 조건을 함께 확인해주세요.' },
]
export default function AboutPage() {
 const [openFaq, setOpenFaq] = useState<number | null>(0)
 return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]">
 <TopNav />
 <main className="pt-16">
 <section className="border-b border-[var(--lu-line)] bg-white px-5 py-14 md:py-20">
 <div className="mx-auto max-w-5xl">
 <p className="text-sm font-semibold text-[var(--lu-accent)]">LOCALUTION</p>
 <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">장사 끝나고 남은 마케팅 업무,<br className="hidden sm:block" /> 한곳에서 이어가세요.</h1>
 <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--lu-muted)]">리뷰를 확인하고, 매장 공지를 준비하고, 행사 비용을 비교하는 일. 흩어진 업무를 모아 사장님이 다음에 할 일을 쉽게 찾도록 돕습니다.</p>
 <div className="mt-8 flex flex-wrap gap-3">
 <Link href="/marketing" className="lu-primary inline-flex min-h-11 items-center gap-2">지금 필요한 도구 찾기<ArrowRight size={18} aria-hidden="true" /></Link>
 <Link href="/help/videos" className="lu-secondary inline-flex min-h-11 items-center">기능 영상 보기</Link>
 </div>
 <p className="mt-5 text-sm leading-7 text-[var(--lu-muted)]">계정 자료를 쓰는 기능은 본인 계정의 연결 상태와 수집 결과를 먼저 확인해주세요.</p>
 </div>
 </section>
 <section className="mx-auto max-w-5xl px-5 py-12 md:py-16" aria-labelledby="about-tasks">
 <h2 id="about-tasks" className="text-2xl font-semibold">오늘 남은 일부터 하나씩</h2>
 <p className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">입력할 조건과 결과 확인 방법을 살펴보고 필요한 도구를 선택하세요.</p>
 <div className="mt-7 grid gap-4 md:grid-cols-2">{TASKS.map(({ Icon, title, text, href }) => <article key={title} className="rounded-[10px] border border-[var(--lu-line)] bg-white p-5 md:p-6"><Icon size={22} className="text-[var(--lu-accent)]" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">{text}</p><Link href={href} className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--lu-accent)]">도구 확인하기<ArrowRight size={16} aria-hidden="true" /></Link></article>)}</div>
 </section>
 <section className="border-y border-[var(--lu-line)] bg-white px-5 py-12 md:py-16"><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-semibold">사장님이 확인할 수 있는 흐름</h2><p className="mt-4 max-w-3xl text-base leading-8 text-[var(--lu-muted)]">로컬루션의 목표는 반복되는 업무를 줄여 사장님이 장사에 쓸 시간을 확보하는 것입니다. 자료 확인부터 초안 준비, 가능한 실행과 결과 확인까지 이어지는 흐름을 만듭니다.</p><ol className="mt-7 grid gap-4 md:grid-cols-3">{['내 매장과 연결 상태 확인', '실제 조건으로 초안 준비', '저장과 실행 결과 확인'].map((text, i) => <li key={text} className="rounded-[10px] border border-[var(--lu-line)] p-5"><span className="text-sm font-semibold text-[var(--lu-accent)]">{i + 1}</span><p className="mt-3 font-semibold leading-7">{text}</p></li>)}</ol></div></section>
 <section className="mx-auto max-w-5xl px-5 py-12 md:py-16"><h2 className="text-2xl font-semibold">사용하면서 확인할 원칙</h2><div className="mt-7 grid gap-5 md:grid-cols-2">{PRINCIPLES.map(item => <article key={item.title} className="border-t border-[var(--lu-line)] pt-5"><CheckCircle2 size={20} className="text-[var(--lu-accent)]" aria-hidden="true" /><h3 className="mt-3 text-lg font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">{item.text}</p></article>)}</div></section>
 <section className="border-t border-[var(--lu-line)] bg-white px-5 py-12 md:py-16"><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-semibold">이용 전에 궁금한 점</h2><div className="mt-7 divide-y divide-[var(--lu-line)]">{FAQ.map((item, i) => <div key={item.q}><h3><button type="button" aria-expanded={openFaq === i} aria-controls={`about-faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex min-h-14 w-full items-center justify-between gap-5 py-4 text-left font-semibold"><span>{item.q}</span><span aria-hidden="true">{openFaq === i ? '−' : '+'}</span></button></h3><div id={`about-faq-${i}`} hidden={openFaq !== i} className="pb-5 text-sm leading-7 text-[var(--lu-muted)]">{item.a}</div></div>)}</div><Link href="/pricing" className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--lu-accent)]">요금과 이용 조건 확인<ArrowRight size={16} aria-hidden="true" /></Link></div></section>
 <section className="border-t border-[var(--lu-line)] px-5 py-8"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-3"><Image src="/brand/localution-mark-20261018.png" alt="로컬루션 로고" width={28} height={28} /><span className="font-semibold">LOCALUTION</span></div><Link href="/inquiry" className="inline-flex min-h-11 items-center font-semibold text-[var(--lu-accent)]">이용 문의</Link></div></section>
 </main><Footer />
 </div>
}
