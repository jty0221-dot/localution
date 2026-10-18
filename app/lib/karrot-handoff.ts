export const KARROT_BUSINESS_URL = 'https://business.daangn.com/'
export const KARROT_API_NOTICE = 'https://business.daangn.com/notice/detail/420'

export function buildKarrotText(title: string, body: string): string | null {
  if (!title.trim() || !body.trim()) return null
  return `${title.trim()}\n\n${body.trim()}`
}

export function validateKarrotImages(files: File[]): string | null {
  if (files.length > 10) return '한 번에 사진 10장까지 준비할 수 있어요.'
  if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return 'JPG, PNG, WebP 사진을 선택해 주세요.'
  if (files.some(file => file.size > 10 * 1024 * 1024)) return '사진 한 장의 크기를 10MB 이하로 줄여 주세요.'
  return null
}

type SharePort = { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean }
export async function shareKarrotDraft(title: string, body: string, files: File[], port: SharePort): Promise<'shared' | 'cancelled' | 'unsupported' | 'files-unsupported' | 'failed' | 'empty'> {
  const text = buildKarrotText(title, body)
  if (!text) return 'empty'
  if (!port.share) return 'unsupported'
  const data: ShareData = { title: title.trim(), text, ...(files.length ? { files } : {}) }
  try {
    if (files.length && (!port.canShare || !port.canShare(data))) return 'files-unsupported'
    await port.share(data); return 'shared'
  }
  catch (error) { return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'failed' }
}
