import crypto from 'crypto'

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30분

function getSecret(): string {
 const secret = process.env.LOCALUTION_COOKIE_SECRET
 if (!secret) throw new Error('import_token_not_configured')
 return secret
}

export function signImportToken(userId: string): string {
 if (!userId.trim()) throw new Error('invalid_import_user')
 const payload = { uid: userId, exp: Date.now() + TOKEN_TTL_MS, kind: 'cpe-rev' }
 const json = JSON.stringify(payload)
 const b64 = Buffer.from(json, 'utf8').toString('base64url')
 const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url')
 return `${b64}.${sig}`
}

export function verifyImportToken(token: string): { userId: string } | null {
 try {
 const parts = token.split('.')
 if (parts.length !== 2) return null
 const [b64, sig] = parts
 if (!b64 || !sig) return null
 const expected = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url')
 // constant-time compare
 if (sig.length !== expected.length) return null
 let mismatch = 0
 for (let i = 0; i < sig.length; i++) {
 mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
 }
 if (mismatch !== 0) return null
 const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
 if (!payload || payload.kind !== 'cpe-rev') return null
 if (typeof payload.uid !== 'string' || !payload.uid.trim()) return null
 if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null
 return { userId: payload.uid }
 } catch {
 return null
 }
}
