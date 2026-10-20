"use client"
import { useEffect, useRef, useState } from 'react'
import { useUser } from './useUser'

export function koreaDate(date = new Date()): string {
 return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
export function addCalendarDays(date: string, days: number): string {
 const value = new Date(`${date}T00:00:00Z`)
 value.setUTCDate(value.getUTCDate() + days)
 return value.toISOString().slice(0, 10)
}
export function accountStorageKey(scope: string, owner: string): string {
 if (!owner.trim()) throw new Error('로그인 계정을 확인한 뒤 다시 시도해주세요.')
 return `localution.account.${encodeURIComponent(owner)}.${scope}.v1`
}
export function readAccountList<T>(storage: Pick<Storage, 'getItem'>, scope: string, owner: string): T[] {
 const raw = storage.getItem(accountStorageKey(scope, owner))
 if (raw === null) return []
 const list: unknown = JSON.parse(raw)
 if (!Array.isArray(list) || list.some(item => !item || typeof item !== 'object' || typeof item.id !== 'string')) throw new Error('이 기기에 저장된 자료를 읽지 못했어요. 기존 자료는 보존했어요.')
 if (scope === 'events' && list.some(item => typeof item.startDate !== 'string' || typeof item.endDate !== 'string' || typeof item.title !== 'string')) throw new Error('저장된 이벤트 형식을 확인할 수 없어요.')
 if (scope === 'reservations' && list.some(item => typeof item.date !== 'string' || typeof item.time !== 'string' || typeof item.customerName !== 'string' || !['confirmed', 'pending', 'completed', 'cancelled'].includes(item.status))) throw new Error('저장된 예약 형식을 확인할 수 없어요.')
 return list as T[]
}
export async function writeAccountList<T>(storage: Pick<Storage, 'setItem'>, scope: string, owner: string, list: T[], currentOwner: () => string | null, request: typeof fetch = fetch): Promise<void> {
 accountStorageKey(scope, owner)
 const response = await request('/api/me', { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) })
 const body = await response.json()
 if (!response.ok || body?.user?.id !== owner || currentOwner() !== owner) throw new Error('로그인 계정이 바뀌었거나 확인되지 않았어요. 다시 로그인한 뒤 저장해주세요.')
 storage.setItem(accountStorageKey(scope, owner), JSON.stringify(list))
}
export function useAccountLocalList<T>(scope: string) {
 const { user, loading } = useUser()
 const owner = !loading && user?.id ? user.id : null
 const ownerRef = useRef<string | null>(owner)
 ownerRef.current = owner
 const [state, setState] = useState<{ owner: string | null; list: T[]; readable: boolean }>({ owner: null, list: [], readable: false })
 const [error, setError] = useState<string | null>(null)
 const [saving, setSaving] = useState(false)
 const busy = useRef(false)
 useEffect(() => {
 setError(null)
 if (!owner) { setState({ owner: null, list: [], readable: false }); return }
 try { setState({ owner, list: readAccountList<T>(localStorage, scope, owner), readable: true }) }
 catch { setState({ owner, list: [], readable: false }); setError('이 기기에 저장된 자료를 읽지 못했어요. 저장 공간과 브라우저 설정을 확인해주세요. 기존 자료는 보존했어요.') }
 }, [owner, scope])
 const ready = !!owner && state.owner === owner && state.readable
 async function save(list: T[]) {
 if (!ready || !owner || busy.current) return false
 busy.current = true; setSaving(true); setError(null)
 try {
 await writeAccountList(localStorage, scope, owner, list, () => ownerRef.current)
 if (ownerRef.current !== owner) return false
 setState({ owner, list, readable: true }); return true
 } catch (reason) {
 if (ownerRef.current === owner) setError(reason instanceof Error && reason.message.includes('로그인') ? reason.message : '이 기기에 저장하지 못했어요. 입력은 유지했어요. 저장 공간과 브라우저 설정을 확인한 뒤 다시 시도해주세요.')
 return false
 } finally { busy.current = false; setSaving(false) }
 }
 return { list: ready ? state.list : [], owner, ready, saving, error, save, authMessage: loading ? '로그인 계정을 확인하고 있어요.' : !owner ? '로그인 계정을 확인하지 못했어요. 다시 로그인한 뒤 이용해주세요.' : null }
}
