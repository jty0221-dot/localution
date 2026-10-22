import { cookies } from 'next/headers'
import { verifyCookie } from './cookieSigning'
import { createServiceClient } from './adminAuth'
import type { UserResult } from './userAuth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type VerifiedIdentity = { ok: true; userId: string } | { ok: false; status: 409 | 503; code: 'identity_mapping_required' | 'identity_verification_failed'; error: string }
type Binding = { provider: 'naver'; providerClientId: string; rawId: string; authUserId: string; verifiedAt: string; expiresAt: string; approvedRef: string }
const missing = (): VerifiedIdentity => ({ ok: false, status: 409, code: 'identity_mapping_required', error: '로그인 계정과 기존 회원의 연결 확인이 필요해요. 고객지원에 확인을 요청해주세요. 추가 결제하지 마세요.' })
const failed = (): VerifiedIdentity => ({ ok: false, status: 503, code: 'identity_verification_failed', error: '계정 연결을 안전하게 확인하지 못했어요. 잠시 후 다시 확인해주세요.' })

// Server-managed configuration only. Never infer ownership from email or user_metadata.
// {version:1,bindings:[{provider,providerClientId,rawId,authUserId,verifiedAt,expiresAt,approvedRef}]}
export function parseVerifiedBindings(raw: string, now = Date.now()): Binding[] {
 const value = JSON.parse(raw)
 if (!value || value.version !== 1 || !Array.isArray(value.bindings) || value.bindings.length > 1000) throw new Error('invalid_binding_config')
 const identities = new Set<string>(), targets = new Set<string>()
 return value.bindings.map((entry: unknown) => {
 if (!entry || typeof entry !== 'object') throw new Error('invalid_binding_config')
 const row = entry as Record<string, unknown>
 const required = ['providerClientId','rawId','authUserId','verifiedAt','expiresAt','approvedRef']
 if (row.provider !== 'naver' || required.some(key => typeof row[key] !== 'string' || !(row[key] as string).trim() || (row[key] as string).length > 512) || !UUID.test(row.authUserId as string)) throw new Error('invalid_binding_config')
 const verified = Date.parse(row.verifiedAt as string), expires = Date.parse(row.expiresAt as string)
 if (!Number.isFinite(verified) || !Number.isFinite(expires) || verified > now || expires <= now || expires <= verified) throw new Error('invalid_binding_period')
 const identity = JSON.stringify([row.provider,row.providerClientId,row.rawId]), target = (row.authUserId as string).toLowerCase()
 if (identities.has(identity) || targets.has(target)) throw new Error('duplicate_binding')
 identities.add(identity); targets.add(target)
 return { ...row, authUserId: target } as Binding
 })
}

export async function resolveVerifiedIdentity(auth: Extract<UserResult, {ok:true}>): Promise<VerifiedIdentity> {
 if (auth.source === 'supabase') return UUID.test(auth.userId) ? {ok:true,userId:auth.userId} : failed()
 if (auth.source !== 'localution') return failed()
 try {
 const signed = verifyCookie((await cookies()).get('localution_user')?.value || '')
 if (!signed || signed.id !== auth.userId || signed.provider !== 'naver') return missing()
 const clientId = process.env.NAVER_CLIENT_ID
 const raw = process.env.LOCALUTION_VERIFIED_IDENTITY_BINDINGS
 if (!clientId || !raw) return missing()
 const binding = parseVerifiedBindings(raw).find(row => row.provider === signed.provider && row.rawId === signed.id && row.providerClientId === clientId)
 if (!binding) return missing()
 let timer: ReturnType<typeof setTimeout> | undefined
 try {
 const result = await Promise.race([
 createServiceClient().auth.admin.getUserById(binding.authUserId),
 new Promise<never>((_,reject) => { timer = setTimeout(() => reject(new Error('identity_timeout')),10000) }),
 ])
 if (result.error || !result.data?.user || result.data.user.id.toLowerCase() !== binding.authUserId) return failed()
 return {ok:true,userId:binding.authUserId}
 } finally { if (timer) clearTimeout(timer) }
 } catch { return failed() }
}
