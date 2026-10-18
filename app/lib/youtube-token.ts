import { createServiceClient } from './adminAuth'
import { encryptSecret, decryptSecret } from './crypto-utils'

export const youtubeConfig = () => ({ clientId: process.env.YOUTUBE_CLIENT_ID, clientSecret: process.env.YOUTUBE_CLIENT_SECRET, callback: process.env.YOUTUBE_CALLBACK_URL })
export const youtubeConfigured = () => {
 const config=youtubeConfig()
 if(!Object.values(config).every(Boolean)||!process.env.ENCRYPTION_KEK_HEX)return false
 try{const url=new URL(config.callback!);return url.protocol==='https:'&&url.pathname==='/api/oauth/youtube/callback'&&!url.username&&!url.password&&!url.search&&!url.hash}catch{return false}
}
type Connection = { access_token: string; refresh_token: string; expires_at: number; channelId: string; channelTitle: string }
export async function saveYoutubeConnection(userId: string, connection: Connection) {
  if (!userId) throw new Error('authentication_required')
  const enc = encryptSecret(JSON.stringify(connection))
  const { error } = await createServiceClient().from('youtube_connections').upsert({
    user_id: userId, channel_id: connection.channelId, channel_title: connection.channelTitle,
    encrypted_token: enc, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw new Error('connection_save_failed')
}
export async function loadYoutubeConnection(userId: string): Promise<Connection | null> {
  if (!userId) throw new Error('authentication_required')
  const { data, error } = await createServiceClient().from('youtube_connections').select('encrypted_token').eq('user_id',userId).maybeSingle()
  if (error) throw new Error(error.code==='42P01'||error.code==='PGRST205'?'schema_required':'connection_read_failed')
  if (!data) return null
  const connection: Connection = JSON.parse(decryptSecret(data.encrypted_token))
  if (connection.expires_at > Date.now()+60000) return connection
  const config=youtubeConfig()
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId!,client_secret:config.clientSecret!,refresh_token:connection.refresh_token,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000),cache:'no-store'})
  const token=await response.json()
  if (!response.ok || !token.access_token) throw new Error('reconnect_required')
  const lifetime=Number(token.expires_in)
  if(!Number.isFinite(lifetime)||lifetime<=0)throw new Error('reconnect_required')
  connection.access_token=token.access_token;connection.expires_at=Date.now()+lifetime*1000
  await saveYoutubeConnection(userId,connection)
  return connection
}
export async function youtubeGet(path: string, token: string) {
  const response=await fetch('https://www.googleapis.com/youtube/v3/'+path,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(15000)})
  if (!response.ok) throw new Error('youtube_request_failed')
  return response.json()
}
export function validYoutubeUploadUrl(value: string) {
  try { const u=new URL(value);return u.protocol==='https:' && u.hostname==='www.googleapis.com' && !u.username && !u.password && (!u.port||u.port==='443') && u.pathname==='/upload/youtube/v3/videos' && Boolean(u.searchParams.get('upload_id')) } catch {return false}
}
export type YoutubeUploadSession={uid:string;url:string;size:number;mime:string;channel:string;expiresAt:number}
export function sealYoutubeUpload(session:YoutubeUploadSession){return Buffer.from(JSON.stringify(encryptSecret(JSON.stringify(session)))).toString('base64url')}
export function openYoutubeUpload(sealed:string,userId:string):YoutubeUploadSession {
 if(typeof sealed!=='string'||sealed.length>16000)throw new Error('invalid_session')
 const session:YoutubeUploadSession=JSON.parse(decryptSecret(JSON.parse(Buffer.from(sealed,'base64url').toString('utf8'))))
 if(session.uid!==userId||!Number.isFinite(session.expiresAt)||session.expiresAt<Date.now()||!validYoutubeUploadUrl(session.url)||!Number.isSafeInteger(session.size)||session.size<=0)throw new Error('invalid_session')
 return session
}
