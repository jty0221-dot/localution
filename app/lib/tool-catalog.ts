export const BUSINESS_AUDIENCES = [
  { id: 'all', label: '전체 업종' },
  { id: 'food', label: '음식점과 카페' },
  { id: 'service', label: '미용과 생활서비스' },
  { id: 'education', label: '학원과 교육' },
  { id: 'retail', label: '소매와 1인 사업' },
  { id: 'agency', label: '여러 매장 관리' },
] as const

export type BusinessAudience = typeof BUSINESS_AUDIENCES[number]['id']
export type BusinessTask = {
  id: string
  title: string
  problem: string
  preparation: string
  result: string
  href: string
  category: '매장 알리기' | '콘텐츠 만들기' | '고객 관리' | '이용 준비'
  audiences: Exclude<BusinessAudience, 'all'>[]
  access: 'browser' | 'account' | 'tool'
  searchTerms: string[]
}

const EVERYONE: Exclude<BusinessAudience, 'all'>[] = ['food', 'service', 'education', 'retail', 'agency']

export const BUSINESS_TASKS: BusinessTask[] = [
  { id: 'campaign-url', title: '게시처를 구분하는 홍보 링크 만들기', problem: '여러 곳에 올린 홍보를 출처별로 구분하고 싶어요.', preparation: '도착 주소와 유입 출처, 홍보 방식, 캠페인 이름', result: '직접 확인하고 복사하거나 내려받는 UTM 홍보 주소', href: '/marketing/campaign-url', category: '매장 알리기', audiences: EVERYONE, access: 'browser', searchTerms: ['UTM', '홍보링크', '링크', '캠페인', '출처', '태그'] },
  { id: 'promotion-profit', title: '할인과 쿠폰 행사의 수익 비교하기', problem: '할인을 하면 얼마나 더 팔아야 하는지 알고 싶어요.', preparation: '평소 판매가와 할인 조건, 비용, 예상 판매량, 고정비와 홍보비', result: '같은 한 달 가정의 행사 전후 예상 이익과 필요 판매량', href: '/marketing/promotion-profit', category: '이용 준비', audiences: EVERYONE, access: 'browser', searchTerms: ['할인', '쿠폰', '행사', '마진', '수익', '홍보비'] },
  { id: 'cost-calculator', title: '상품 원가와 손익분기 판매량 계산하기', problem: '판매가에서 얼마가 남고 몇 개를 팔아야 하는지 알고 싶어요.', preparation: '상품 한 개의 판매가와 비용, 수수료율, 월 고정비와 목표 이익', result: '입력 조건에 따른 공헌이익, 손익분기와 목표 판매량, 가격 변경 비교', href: '/marketing/cost-calculator', category: '이용 준비', audiences: EVERYONE, access: 'browser', searchTerms: ['원가', '마진', '손익분기', '수익', '계산기', '판매가', '고정비', '목표 판매량'] },
  { id: 'business-search', title: '매장과 콘텐츠 참고 자료 찾기', problem: '업체 이름이나 소개 글을 어디서 찾아야 할지 모르겠어요.', preparation: '로그인과 지역, 업종, 직접 확인할 검색어', result: '공급자와 출처가 표시된 업체 또는 블로그와 카페 검색 결과', href: '/marketing/business-search', category: '매장 알리기', audiences: EVERYONE, access: 'account', searchTerms: ['매장 검색', '업체 검색', '네이버', '구글', '주변', '블로그 참고', '카페 글'] },
  { id: 'notice', title: '휴무와 영업시간 공지 쓰기', problem: '매번 고객 안내 문구를 새로 쓰기 어려워요.', preparation: '매장명과 안내할 날짜 또는 변경 내용', result: '직접 확인하고 복사하거나 내려받는 공지 문안', href: '/marketing/notice', category: '콘텐츠 만들기', audiences: EVERYONE, access: 'browser', searchTerms: ['휴무', '휴가', '명절', '시간', '예약 안내', '이전', '신메뉴', '공지'] },
  { id: 'place', title: '내 매장이 검색에 어떻게 보이는지 점검하기', problem: '우리 매장 정보를 어디부터 고칠지 모르겠어요.', preparation: '네이버 플레이스 주소와 점검할 키워드', result: '도구에서 조회한 진단 결과와 점검할 항목', href: '/marketing/place', category: '매장 알리기', audiences: EVERYONE, access: 'tool', searchTerms: ['노출', '지도', '플레이스', '검색', '진단', '가게'] },
  { id: 'keywords', title: '고객이 찾는 검색어 살펴보기', problem: '홍보 글에 어떤 키워드를 넣을지 막막해요.', preparation: '지역명과 업종 또는 상품을 나타내는 검색어', result: '조회 결과를 비교해 고르는 콘텐츠 주제', href: '/marketing/naver-ads', category: '매장 알리기', audiences: EVERYONE, access: 'tool', searchTerms: ['검색량', '키워드', '광고', '주제', '지역'] },
  { id: 'reviews', title: '밀린 리뷰 답글 확인하기', problem: '여러 플랫폼의 답글을 하나씩 챙기기 어려워요.', preparation: '로그인과 관리할 매장의 플랫폼 연결', result: '수집된 리뷰를 확인하고 검토하는 답글 초안', href: '/review-admin', category: '고객 관리', audiences: EVERYONE, access: 'account', searchTerms: ['답변', '답글', '배민', '구글', '리뷰', '부정', '불만'] },
  { id: 'blog', title: '가게와 서비스를 소개하는 글 준비하기', problem: '알리고 싶은 것은 있는데 글로 정리하기 어려워요.', preparation: '매장 정보와 실제 강점, 글의 주제와 키워드', result: '사실을 확인하고 수정해 사용하는 블로그 초안', href: '/marketing/blog-post', category: '콘텐츠 만들기', audiences: EVERYONE, access: 'tool', searchTerms: ['블로그', '글쓰기', '포스팅', '시공', '수업', '메뉴', '서비스'] },
  { id: 'reels', title: '짧은 영상의 촬영 순서 정하기', problem: '영상을 찍고 싶지만 무엇부터 찍을지 모르겠어요.', preparation: '보여줄 상품이나 서비스와 영상의 주제', result: '촬영과 편집에 참고하는 장면별 대본', href: '/marketing/reels', category: '콘텐츠 만들기', audiences: EVERYONE, access: 'tool', searchTerms: ['릴스', '쇼츠', '영상', '촬영', '대본', '인스타'] },
  { id: 'cards', title: '사진과 설명을 카드뉴스로 정리하기', problem: '여러 장의 사진에 설명을 붙여 알리고 싶어요.', preparation: '주제와 직접 사용할 수 있는 사진', result: '내용을 검토한 뒤 저장하는 카드 이미지', href: '/marketing/card-news', category: '콘텐츠 만들기', audiences: EVERYONE, access: 'tool', searchTerms: ['카드뉴스', '이미지', '사진', '홍보물', '게시물'] },
  { id: 'tracking', title: '발행한 블로그 글의 노출 확인하기', problem: '여러 글을 올린 뒤 검색 결과를 매번 찾기 번거로워요.', preparation: '발행한 글의 주소와 확인할 키워드', result: '도구에서 확인하는 글별 노출 기록', href: '/marketing/blog-tracking', category: '매장 알리기', audiences: EVERYONE, access: 'tool', searchTerms: ['체험단', '추적', '보고서', '블로그 순위', '모니터링'] },
  { id: 'customers', title: '단골 고객의 방문 기록 정리하기', problem: '고객 정보와 방문 기록이 여기저기 흩어져 있어요.', preparation: '로그인과 적법하게 보유한 고객 정보', result: '고객 목록과 방문 기록을 한 화면에서 관리', href: '/customers', category: '고객 관리', audiences: EVERYONE, access: 'account', searchTerms: ['단골', '고객', '재방문', '회원', 'CRM', '수강생'] },
  { id: 'reservations', title: '예약과 방문 일정 정리하기', problem: '전화와 메신저로 받은 예약을 놓치기 쉬워요.', preparation: '로그인과 예약 날짜, 시간, 필요한 메모', result: '예약 목록과 진행 상태를 확인하는 일정', href: '/reservations', category: '고객 관리', audiences: EVERYONE, access: 'account', searchTerms: ['예약', '일정', '상담', '방문', '시술', '수업', '공방'] },
  { id: 'qr', title: '매장에서 사용할 QR 안내 준비하기', problem: '고객에게 링크를 매번 설명하기 번거로워요.', preparation: '로그인과 매장 정보, 연결할 안내', result: '저장 결과를 확인하고 내려받는 QR 이미지', href: '/qr-admin', category: '고객 관리', audiences: EVERYONE, access: 'account', searchTerms: ['QR', '메뉴판', '리뷰 안내', '스탬프', '매장 안내'] },
  { id: 'connect', title: '사용 중인 플랫폼 연결 상태 확인하기', problem: '리뷰가 안 들어올 때 무엇을 확인해야 할지 모르겠어요.', preparation: '로그인과 관리 권한이 있는 플랫폼 계정', result: '플랫폼별 연결 상태와 필요한 다음 단계', href: '/my/platforms', category: '이용 준비', audiences: EVERYONE, access: 'account', searchTerms: ['연동', '연결', '로그인', '쿠키', '배달', '안 들어옴'] },
]

export function findBusinessTasks(query: string, audience: BusinessAudience = 'all'): BusinessTask[] {
  const tokens = query.normalize('NFKC').toLocaleLowerCase('ko-KR').trim().split(/\s+/).filter(Boolean)
  return BUSINESS_TASKS.filter(task => {
    if (audience !== 'all' && !task.audiences.includes(audience)) return false
    const haystack = [task.title, task.problem, task.preparation, task.result, task.category, ...task.searchTerms].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR')
    return tokens.every(token => haystack.includes(token))
  })
}

export const BUSINESS_STARTS: Record<BusinessAudience, { tasks: string[]; description: string }> = {
  all: { tasks: ['notice', 'place', 'reviews'], description: '운영 안내를 준비하거나 매장 정보와 리뷰부터 점검해 보세요.' },
  food: { tasks: ['promotion-profit', 'place', 'reviews'], description: '휴무와 새 메뉴를 알리고 매장 정보와 고객 리뷰를 점검해 보세요.' },
  service: { tasks: ['reservations', 'blog', 'reviews'], description: '접수한 방문과 상담 일정을 정리하고 시술이나 작업 내용을 소개해 보세요.' },
  education: { tasks: ['reservations', 'blog', 'notice'], description: '상담 일정을 정리하고 수업 소개와 운영 안내를 준비해 보세요.' },
  retail: { tasks: ['promotion-profit', 'cards', 'notice'], description: '상품이나 서비스를 소개할 글과 이미지, 운영 안내를 준비해 보세요.' },
  agency: { tasks: ['campaign-url', 'connect', 'reviews'], description: '담당 매장 연결을 확인한 뒤 리뷰와 발행한 게시글을 점검해 보세요.' },
}

export const TASK_ACTIONS: Record<string, { label: string; next: string }> = {
  'campaign-url': { label: '홍보 링크 만들기', next: '도착 주소와 태그를 확인하고 게시한 뒤 별도 분석 도구에서 수집 여부를 확인하세요.' },
  'promotion-profit': { label: '할인 조건 비교하기', next: '계산 가정과 실제 비용을 확인한 뒤 할인 조건을 정하고 공지를 준비하세요.' },
  'cost-calculator': { label: '원가와 목표 판매량 계산하기', next: '빠진 비용과 판매량 가정을 확인하고 가격별 예상 이익을 비교한 뒤 필요한 계산 조건을 저장하세요.' },
  'business-search': { label: '매장과 참고 글 찾아보기', next: '원문에서 업체와 내용을 직접 확인하고 우리 매장의 실제 정보와 구분해 활용하세요.' },
  notice: { label: '공지 문안 작성하기', next: '날짜와 연락 방법을 확인하고 필요한 채널에 직접 붙여넣으세요.' },
  place: { label: '매장 노출 점검하기', next: '조회한 항목을 실제 매장 정보와 대조해 수정할 내용을 골라보세요.' },
  keywords: { label: '검색어 살펴보기', next: '조회한 검색어에서 우리 상품이나 서비스와 맞는 주제를 골라보세요.' },
  reviews: { label: '리뷰 답글 확인하기', next: '답글 내용을 검토하고 등록을 진행했다면 실제 플랫폼에서 확인하세요.' },
  blog: { label: '소개 글 초안 준비하기', next: '매장 정보와 직접 확인한 사실에 맞게 초안을 수정한 뒤 사용하세요.' },
  reels: { label: '촬영 대본 준비하기', next: '촬영할 수 있는 장면을 고르고 실제 소재에 맞춰 대본을 조정하세요.' },
  cards: { label: '카드 이미지 준비하기', next: '사진 사용 권한과 문구를 확인한 뒤 원하는 채널에 직접 올리세요.' },
  tracking: { label: '게시글 노출 확인하기', next: '조회한 날짜와 키워드를 함께 확인하고 이전 기록과 비교하세요.' },
  customers: { label: '고객 기록 정리하기', next: '저장 결과를 확인하고 고객 정보의 사용 목적에 맞게 관리하세요.' },
  reservations: { label: '예약 일정 정리하기', next: '접수한 예약의 날짜와 시간을 대조하고 변경 사항을 반영하세요.' },
  qr: { label: 'QR 안내 준비하기', next: '내려받은 QR을 휴대전화로 스캔해 연결되는 매장과 안내를 확인하세요.' },
  connect: { label: '플랫폼 연결 확인하기', next: '연결 상태와 최근 수집 결과를 확인하고 필요한 경우 다시 연결하세요.' },
}
