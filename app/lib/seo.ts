// ═══════════════════════════════════════════════════════════
// app/lib/seo.ts
// SEO · GEO · AEO 단일 사실 원본 (single source of facts)
// ─────────────────────────────────────────────────────────
// · 화면 문구 · JSON-LD · llms.txt · sitemap · robots · manifest 가
//   전부 이 파일의 SITE 를 읽는다. 숫자를 바꿀 때는 여기 한 곳만 고친다.
// · 법적 사업자 정보는 app/lib/company.ts 가 정본이고 여기서는 가져다 쓴다.
// · 스스로 매기는 평점(aggregateRating) · 가짜 리뷰는 넣지 않는다.
//   구글 정책 위반이고 사장님 신뢰를 깎는다.
// ═══════════════════════════════════════════════════════════

import type { Metadata } from 'next'
import { COMPANY } from './company'

export const SITE = {
  url: 'https://www.localution.co.kr',
  name: '로컬루션',
  nameEn: 'Localution',
  tagline: '사장님의 네이버·구글·배민 마케팅, AI가 대신합니다',
  description:
    '네이버·구글·카카오맵·배민·요기요·쿠팡이츠 리뷰 자동 답글, 인스타·유튜브 쇼츠 자동화, AI 매장 진단까지. 커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰답글 자동.',
  // 한 문장으로 답할 때 쓰는 정의문 (GEO 인용용 · 두 문장 이내)
  answer:
    '로컬루션은 소상공인·자영업자를 위한 AI 마케팅 자동화 플랫폼입니다. 네이버·구글·카카오맵·배민·요기요·쿠팡이츠 6개 플랫폼의 리뷰를 한 곳에 모아 AI 답글을 만들고 자동으로 등록합니다.',
  locale: 'ko_KR',
  lang: 'ko',
  themeColor: '#3182F6',
  backgroundColor: '#F8F9FA',
  logo: '/logo.png', // 512x512
  ogImage: '/opengraph-image', // app/opengraph-image.tsx 자동 생성 1200x630
  ogAlt: '로컬루션 · 사장님 마케팅 플랫폼',
  launchYear: 2026,
  platforms: ['네이버 플레이스', '구글', '카카오맵', '배달의민족', '요기요', '쿠팡이츠'] as const,
  platformCount: 6,
  toneCount: 11,
  pollingMinutes: 15,
  priceFromKrw: 6900,
  priceText: '월 6,900원',
  audience: ['소상공인', '자영업자', '1인 사장님', '마케팅 대행사', '프랜차이즈 본부'] as const,
  contact: {
    email: COMPANY.EMAIL,
    phone: COMPANY.PHONE,
    kakao: COMPANY.KAKAO_OPENCHAT,
  },
  legal: {
    name: COMPANY.LEGAL_NAME,
    ceo: COMPANY.CEO,
    bizNumber: COMPANY.BIZ_NUMBER,
    ecommerceNumber: COMPANY.ECOMMERCE_NUMBER,
    address: COMPANY.ADDRESS,
  },
  // 외부 채널 (있는 것만 · 없는 링크를 지어내지 않는다)
  sameAs: [COMPANY.KAKAO_OPENCHAT] as string[],
} as const

export const SITE_URL = SITE.url

// ─── 공개 라우트 (sitemap · llms.txt 공용) ───────────────────
// 로그인이 필요한 경로는 절대 넣지 않는다 (partner-points 는 middleware 보호 경로다).
export type PublicRoute = {
  path: string
  title: string
  summary: string
  priority: number
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '', title: '홈', summary: SITE.answer, priority: 1.0, freq: 'weekly' },
  { path: 'service-intro', title: '서비스 소개', summary: '리뷰 자동 답글 · SNS 자동 발행 · QR 리뷰 · 플레이스 진단까지 로컬루션이 하는 일 전체', priority: 0.9, freq: 'monthly' },
  { path: 'pricing', title: '요금제', summary: '월 6,900원부터 필요한 기능만 고르는 선택형 요금제. 신용카드 없이 시작', priority: 0.9, freq: 'monthly' },
  { path: 'about', title: '회사 소개', summary: '로컬루션을 만든 이유와 운영 원칙', priority: 0.8, freq: 'monthly' },
  { path: 'marketing', title: '마케팅 도구', summary: '플레이스 진단 · 키워드 조회 · 블로그 글 작성 · 릴스 대본 등 무료 체험 도구 모음', priority: 0.8, freq: 'weekly' },
  { path: 'marketing/place', title: '네이버 플레이스 진단', summary: '매장 주소만 넣으면 키워드 · 리뷰수 · 답글률을 분석하고 상위노출 체크리스트를 제공', priority: 0.8, freq: 'weekly' },
  { path: 'marketing/blog-post', title: '블로그 글 작성', summary: '매장 정보와 키워드로 네이버 블로그 초안을 생성', priority: 0.8, freq: 'weekly' },
  { path: 'marketing/blog-index', title: '블로그 지수 조회', summary: '네이버 블로그 지수와 노출 상태를 조회', priority: 0.7, freq: 'weekly' },
  { path: 'marketing/naver-ads', title: '키워드 조회·분석', summary: '키워드별 검색량 · 트렌드 · 콘텐츠 포화도를 한눈에', priority: 0.7, freq: 'weekly' },
  { path: 'marketing/reels', title: '릴스 대본', summary: '매장 릴스 · 쇼츠 대본을 AI 가 작성', priority: 0.7, freq: 'weekly' },
  { path: 'marketing/blog-tracking', title: '블로그 순위 추적', summary: '블로그 포스팅 키워드 순위와 스마트블록 노출 위치를 자동 추적', priority: 0.7, freq: 'weekly' },
  { path: 'marketing/card-news', title: '카드뉴스 제작', summary: '인스타 카드뉴스를 템플릿으로 제작', priority: 0.7, freq: 'weekly' },
  { path: 'marketing/keyword-rank', title: '키워드 순위 확인', summary: '내 매장이 네이버 플레이스 어느 순위인지 확인', priority: 0.6, freq: 'monthly' },
  { path: 'marketing/keyword-score', title: '키워드 점수', summary: '키워드 경쟁도와 진입 가능성을 점수로 확인', priority: 0.6, freq: 'monthly' },
  { path: 'marketing/events', title: '이벤트 문안', summary: '매장 이벤트 · 프로모션 문안 생성', priority: 0.5, freq: 'monthly' },
  { path: 'marketing/instagram-feed', title: '인스타 피드', summary: '인스타그램 피드 캡션 생성', priority: 0.5, freq: 'monthly' },
  { path: 'marketing/threads', title: '스레드 자동 발행', summary: '스레드 계정을 연결해 글을 예약 · 자동 발행', priority: 0.5, freq: 'monthly' },
  { path: 'marketing/youtube-community', title: '유튜브 커뮤니티 발행', summary: '유튜브 커뮤니티 게시글을 예약 · 자동 발행', priority: 0.5, freq: 'monthly' },
  { path: 'community', title: '사장님 커뮤니티', summary: '지역 사장님들이 정보를 나누는 게시판', priority: 0.6, freq: 'weekly' },
  { path: 'updates', title: '업데이트 소식', summary: '새로 나온 기능과 변경 사항', priority: 0.7, freq: 'weekly' },
  { path: 'help', title: '도움말', summary: '연결 · 답글 · 결제에 관한 자주 묻는 질문', priority: 0.6, freq: 'monthly' },
  { path: 'inquiry', title: '문의하기', summary: '도입 · 제휴 · 이용 문의', priority: 0.5, freq: 'monthly' },
  { path: 'login', title: '로그인', summary: '구글 · 네이버 · 카카오 소셜 로그인', priority: 0.4, freq: 'yearly' },
  { path: 'signup', title: '회원가입', summary: '신용카드 없이 무료 가입', priority: 0.5, freq: 'yearly' },
  { path: 'terms', title: '이용약관', summary: '서비스 이용약관', priority: 0.3, freq: 'yearly' },
  { path: 'privacy', title: '개인정보처리방침', summary: '개인정보 수집 · 이용 · 보관 기준', priority: 0.3, freq: 'yearly' },
  { path: 'legal/platform-consent', title: '플랫폼 위임 동의서', summary: '외부 플랫폼 계정 연결 시 위임 범위', priority: 0.3, freq: 'yearly' },
]

export function absUrl(path: string): string {
  if (!path) return SITE.url
  if (path.startsWith('http')) return path
  return `${SITE.url}${path.startsWith('/') ? '' : '/'}${path}`
}

// ─── 크롤러 목록 (robots.ts) ─────────────────────────────────
// 검색 봇과 AI 봇을 따로 적어 두는 이유 : 공개 페이지는 둘 다 읽어야
// 검색 결과와 AI 답변 양쪽에 인용된다. 비공개 경로는 둘 다 막는다.
export const SEARCH_BOTS = ['Googlebot', 'Yeti', 'Bingbot', 'Daum', 'DuckDuckBot', 'Applebot', 'Yandex'] as const
export const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Amazonbot', 'Applebot-Extended',
  'cohere-ai', 'meta-externalagent', 'Bytespider', 'CCBot',
] as const
export const SOCIAL_BOTS = ['facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'Slackbot', 'kakaotalk-scrap', 'Discordbot'] as const

// 로그인 뒤에만 보이는 경로 · 검색과 AI 양쪽에서 막는다
export const PRIVATE_PATHS = [
  '/api/', '/admin/', '/admin-biz', '/qr-admin', '/qr', '/my', '/settings', '/dashboard',
  '/review-admin', '/reviews', '/crm', '/customers', '/reservations', '/settlement',
  '/partner-points', '/auth/', '/locked', '/whoami', '/marketing/naver-check', '/marketing/threads/connect',
] as const

// ─── 페이지별 metadata 헬퍼 ──────────────────────────────────
type PageMetaInput = {
  title: string
  description: string
  path: string
  keywords?: string[]
  noIndex?: boolean
}

export function pageMetadata({ title, description, path, keywords, noIndex }: PageMetaInput): Metadata {
  const url = absUrl(path)
  const full = `${title} | ${SITE.name}`
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE.name,
      title: full,
      description,
      locale: SITE.locale,
      images: [{ url: absUrl(SITE.ogImage), width: 1200, height: 630, alt: SITE.ogAlt }],
    },
    twitter: { card: 'summary_large_image', title: full, description, images: [absUrl(SITE.ogImage)] },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}

// ─── JSON-LD 빌더 ────────────────────────────────────────────
export const ORG_ID = `${SITE.url}/#org`
export const APP_ID = `${SITE.url}/#app`
export const WEBSITE_ID = `${SITE.url}/#website`

export function organizationLd() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: SITE.url,
    logo: { '@type': 'ImageObject', url: absUrl(SITE.logo), width: 512, height: 512 },
    description: SITE.answer,
    email: SITE.contact.email,
    telephone: SITE.contact.phone,
    address: { '@type': 'PostalAddress', streetAddress: SITE.legal.address, addressCountry: 'KR' },
    sameAs: SITE.sameAs,
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: SITE.contact.email, availableLanguage: ['ko'] }],
  }
}

export function webSiteLd() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE.url,
    name: SITE.name,
    inLanguage: SITE.lang,
    description: SITE.tagline,
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/community?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function softwareApplicationLd() {
  return {
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: SITE.name,
    url: SITE.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: SITE.lang,
    description: SITE.answer,
    featureList: [
      '6개 플랫폼 리뷰 자동 수집 · AI 답글 (톤 11종)',
      '블로그 · 릴스 · 카드뉴스 · 스레드 · 유튜브 커뮤니티 자동 발행',
      'QR 리뷰 수집',
      '네이버 플레이스 SEO 진단 · 키워드 순위 추적',
      '답글 발행 통계 · 15분 단위 실시간 알림',
    ],
    offers: {
      '@type': 'Offer',
      price: String(SITE.priceFromKrw),
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
      url: `${SITE.url}/pricing`,
      description: `${SITE.priceText}부터 · 기능 선택형`,
    },
    publisher: { '@id': ORG_ID },
  }
}

export type FaqItem = { q: string; a: string }

export function faqPageLd(items: FaqItem[], id?: string) {
  return {
    '@type': 'FAQPage',
    ...(id ? { '@id': id } : {}),
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  }
}

export function webPageLd(input: { path: string; name: string; description: string; type?: string }) {
  return {
    '@type': input.type || 'WebPage',
    '@id': `${absUrl(input.path)}#webpage`,
    url: absUrl(input.path),
    name: input.name,
    description: input.description,
    inLanguage: SITE.lang,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': APP_ID },
  }
}

export function graphLd(nodes: Array<Record<string, unknown>>) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
