import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'
import { sameOrigin, instagramAccount, InstagramError } from '@/app/lib/instagram-api'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function POST(request: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: '로그인한 뒤 업로드해주세요.' }, { status: 401, headers })
 try {
  sameOrigin(request)
  if (!rateLimitByIp(request, `instagram-upload:${auth.userId}`, 10, 60).ok) return NextResponse.json({ ok: false, error: '잠시 후 다시 업로드해주세요.' }, { status: 429, headers })
  const body = await request.json()
  if (body.publicStorageConsent !== true) throw new InstagramError('invalid_request')
  const folder = `instagram/${createHash('sha256').update(auth.userId).digest('hex')}`
  const client = createServiceClient()
  const storage = client.storage.from('instagram-media')
  if (body.action === 'sign') {
   await instagramAccount(auth.userId)
   const { data: bucket, error: bucketError } = await client.storage.getBucket('instagram-media')
   if (bucketError || !bucket || !bucket.public || !bucket.file_size_limit || Number(bucket.file_size_limit) > 100 * 1024 * 1024 || !Array.isArray(bucket.allowed_mime_types) || !bucket.allowed_mime_types.length || bucket.allowed_mime_types.some((mime: string) => !['image/jpeg', 'video/mp4'].includes(mime))) throw new InstagramError('storage_unavailable', 503)
   const extension = body.type === 'image/jpeg' ? 'jpg' : body.type === 'video/mp4' ? 'mp4' : null
   const limit = extension === 'jpg' ? 8 * 1024 * 1024 : 100 * 1024 * 1024
   if (!extension || !Number.isSafeInteger(body.size) || body.size <= 0 || body.size > limit) throw new InstagramError('invalid_request')
   const path = `${folder}/${randomUUID()}.${extension}`
   const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false })
   if (error || !data) throw new InstagramError('storage_unavailable', 503)
   return NextResponse.json({ ok: true, path, signedUrl: data.signedUrl }, { headers })
  }
  if (body.action !== 'verify' || typeof body.path !== 'string' || !body.path.startsWith(folder + '/')) throw new InstagramError('invalid_request')
  const name = body.path.slice(folder.length + 1)
  if (!/^[0-9a-f-]{36}\.(jpg|mp4)$/.test(name)) throw new InstagramError('invalid_request')
  const { data, error } = await storage.list(folder, { search: name, limit: 2 })
  const file = data?.find(item => item.name === name)
  const expected = name.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4'
  const limit = expected === 'image/jpeg' ? 8 * 1024 * 1024 : 100 * 1024 * 1024
  if (error || !file || !(Number(file.metadata?.size) > 0) || Number(file.metadata?.size) > limit || file.metadata?.mimetype !== expected) throw new InstagramError('invalid_request')
  const { data: publicData } = storage.getPublicUrl(body.path)
  return NextResponse.json({ ok: true, url: publicData.publicUrl, size: Number(file.metadata.size), type: expected }, { headers })
 } catch (error) { return NextResponse.json({ ok: false, error: error instanceof InstagramError && error.code === 'storage_unavailable' ? '공개 미디어 저장소 연결을 확인해주세요.' : '공개 저장 동의와 파일 형식을 확인해주세요. JPEG 8MB, MP4 100MB까지 사용할 수 있어요.' }, { status: error instanceof InstagramError ? error.status : 400, headers }) }
}
