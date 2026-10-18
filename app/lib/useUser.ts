"use client"
import { useEffect, useRef, useState } from 'react'
interface UserData { id: string; name: string; email: string; provider: string; profile_image: string }
export function useUser() {
 const [user, setUser] = useState<UserData | null>(null)
 const [loading, setLoading] = useState(true)
 const sequence = useRef(0)
 useEffect(() => {
 let disposed = false
 let controller: AbortController | null = null
 async function refresh(clear = false) {
 const version = ++sequence.current
 controller?.abort(); controller = new AbortController()
 const request = controller
 const timer = window.setTimeout(() => request.abort(), 15000)
 if (clear) { setUser(null); setLoading(true) }
 try {
 const response = await fetch('/api/me', { credentials: 'include', cache: 'no-store', signal: request.signal })
 const body = await response.json()
 if (disposed || version !== sequence.current) return
 if (!response.ok || !body.user || typeof body.user.id !== 'string' || !body.user.id) { setUser(null); return }
 const profile = body.user
 setUser({ id: profile.id, name: typeof profile.name === 'string' ? profile.name : '', email: typeof profile.email === 'string' ? profile.email : '', provider: typeof profile.provider === 'string' ? profile.provider : '', profile_image: typeof profile.profile_image === 'string' ? profile.profile_image : '' })
 } catch { if (!disposed && version === sequence.current) setUser(null) }
 finally { window.clearTimeout(timer); if (!disposed && version === sequence.current) setLoading(false) }
 }
 const recheck = () => { void refresh() }
 const invalidate = () => { void refresh(true) }
 const visibility = () => { if (document.visibilityState === 'visible') recheck(); else { ++sequence.current; controller?.abort() } }
 void refresh(true)
 window.addEventListener('focus', recheck)
 window.addEventListener('localution:auth-changed', invalidate)
 window.addEventListener('storage', invalidate)
 document.addEventListener('visibilitychange', visibility)
 return () => { disposed = true; ++sequence.current; controller?.abort(); window.removeEventListener('focus', recheck); window.removeEventListener('localution:auth-changed', invalidate); window.removeEventListener('storage', invalidate); document.removeEventListener('visibilitychange', visibility) }
 }, [])
 const logout = () => { setUser(null); ++sequence.current; window.dispatchEvent(new Event('localution:auth-changed')); window.location.href = '/api/auth/logout' }
 return { user, loading, logout }
}
