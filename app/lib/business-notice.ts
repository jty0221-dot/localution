export const NOTICE_TYPES = {
  holiday: '휴무 안내',
  hours: '영업시간 변경',
  booking: '예약 안내',
  launch: '새 메뉴·서비스',
  move: '매장 이전',
} as const

export type NoticeType = keyof typeof NOTICE_TYPES
export type NoticeInput = {
  type: NoticeType
  store: string
  startDate: string
  endDate: string
  openTime: string
  closeTime: string
  details: string
  bookingMethod: string
  address: string
}
export type NoticeErrors = Partial<Record<keyof NoticeInput, string>>
export const EMPTY_NOTICE: NoticeInput = {
  type: 'holiday', store: '', startDate: '', endDate: '', openTime: '', closeTime: '',
  details: '', bookingMethod: '', address: '',
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateNotice(input: NoticeInput): NoticeErrors {
  const errors: NoticeErrors = {}
  if (!Object.prototype.hasOwnProperty.call(NOTICE_TYPES, input.type)) errors.type = '공지 종류를 선택해 주세요.'
  if (!input.store.trim()) errors.store = '매장명을 입력해 주세요.'
  if (input.store.trim().length > 60) errors.store = '매장명은 60자 안으로 입력해 주세요.'
  if (!validDate(input.startDate)) errors.startDate = '올바른 시작 날짜를 입력해 주세요.'
  const hasPeriod = input.type === 'holiday' || input.type === 'hours' || input.type === 'booking'
  if (hasPeriod && input.endDate && !validDate(input.endDate)) errors.endDate = '올바른 종료 날짜를 입력해 주세요.'
  if (hasPeriod && validDate(input.startDate) && validDate(input.endDate) && input.endDate < input.startDate) errors.endDate = '종료 날짜는 시작 날짜보다 빠를 수 없어요.'
  if (input.type === 'hours') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.openTime)) errors.openTime = '시작 시간을 09:00 형식으로 입력해 주세요.'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.closeTime)) errors.closeTime = '마감 시간을 18:00 형식으로 입력해 주세요.'
    if (input.openTime && input.openTime === input.closeTime) errors.closeTime = '시작과 마감 시간을 다르게 입력해 주세요.'
  }
  if (input.type === 'booking' && !input.bookingMethod.trim()) errors.bookingMethod = '실제 이용할 예약 방법을 입력해 주세요.'
  if (input.type === 'move' && !input.address.trim()) errors.address = '이전할 주소를 입력해 주세요.'
  if (input.type === 'launch' && !input.details.trim()) errors.details = '새 메뉴나 서비스 내용을 입력해 주세요.'
  if (input.details.length > 1000) errors.details = '내용은 1,000자 안으로 입력해 주세요.'
  if (input.type === 'booking' && input.bookingMethod.length > 300) errors.bookingMethod = '예약 방법은 300자 안으로 입력해 주세요.'
  if (input.type === 'move' && input.address.length > 300) errors.address = '주소는 300자 안으로 입력해 주세요.'
  return errors
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일`
}

export function generateNotice(input: NoticeInput): { text: string; errors: NoticeErrors } {
  const errors = validateNotice(input)
  if (Object.keys(errors).length) return { text: '', errors }
  const start = dateLabel(input.startDate)
  const period = input.endDate && input.endDate !== input.startDate ? `${start}부터 ${dateLabel(input.endDate)}까지` : start
  const lines = [`${input.store.trim()} ${NOTICE_TYPES[input.type]}`, '', '안녕하세요.', `${input.store.trim()}입니다.`, '']
  switch (input.type) {
    case 'holiday': lines.push(`${period} 휴무입니다.`, '방문 일정에 참고해 주세요.'); break
    case 'hours': {
      const overnight = input.closeTime < input.openTime ? '다음 날 ' : ''
      lines.push(`${input.endDate ? period : `${start}부터`} 영업시간이 변경됩니다.`, `영업시간은 ${input.openTime}부터 ${overnight}${input.closeTime}까지입니다.`)
      break
    }
    case 'booking': lines.push(`${input.endDate ? period : `${start}부터`} 예약을 안내드립니다.`, `예약 방법: ${input.bookingMethod.trim()}`); break
    case 'launch': lines.push(`${start}부터 새 메뉴·서비스를 안내드립니다.`); break
    case 'move': lines.push(`${start}부터 이전한 매장에서 운영합니다.`, `새 주소: ${input.address.trim()}`); break
  }
  if (input.details.trim()) lines.push('', input.details.trim())
  lines.push('', '감사합니다.')
  return { text: lines.join('\n'), errors: {} }
}
