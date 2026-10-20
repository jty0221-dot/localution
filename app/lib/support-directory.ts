export const SUPPORT_DIRECTORY_CHECKED_AT = '2026-10-21'
export const PUBLIC_DIRECTORY_CHECKED_AT = '2026-10-18'

// 공식 안내 링크. 개별 공고나 정부기관과의 제휴 관계를 뜻하지 않는다.
export const SUPPORT_DIRECTORY = [
 { id: 'bizinfo', title: '기업마당', description: '지원사업 공고의 대상과 신청기간을 원문에서 확인하세요.', href: 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do', group: 'support' },
 { id: 'sbiz24', title: '소상공인24', description: '소상공인 지원사업 안내와 신청 경로를 확인하세요.', href: 'https://www.sbiz24.kr', group: 'support' },
 { id: 'kstartup', title: 'K-Startup', description: '창업지원 공고와 창업 정보를 확인하세요.', href: 'https://www.k-startup.go.kr/web/main/index.do', group: 'support' },
 { id: 'fanfandaero', title: '판판대로', description: '상품 판로·유통·마케팅 지원사업을 확인하세요.', href: 'https://fanfandaero.kr/', group: 'support' },
 { id: 'egbiz', title: '경기기업비서', description: '경기도 사업자를 위한 지역 지원사업과 모집 공고를 확인하세요.', href: 'https://www.egbiz.or.kr/', group: 'support' },
 { id: 'work24', title: '고용24', description: '직원 채용·고용 지원과 직업훈련 정책을 확인하세요.', href: 'https://www.work24.go.kr/cm/main.do', group: 'support' },
 { id: 'seoul', title: '서울시 고시·공고', description: '서울시 지원사업과 관련 공고를 확인하세요. 모집 외 변경·결과 공고도 포함됩니다.', href: 'https://www.seoul.go.kr/news/news_notice.do', group: 'support' },
 { id: 'goad', title: '정부광고 통합지원시스템', description: '정부광고 업무와 관련 절차를 공식 사이트에서 확인하세요.', href: 'https://www.goad.or.kr/hp/comm/main.do', group: 'public' },
 { id: 'g2b', title: '나라장터', description: '공공 조달 공고와 참여 절차를 공식 사이트에서 확인하세요.', href: 'https://www.g2b.go.kr', group: 'public' },
] as const
