'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import {
 Youtube,
 CheckCircle2,
 AlertCircle,
 Upload,
 RefreshCw,
 X,
 Image as ImageIcon,
 MessageSquare,
 Link2,
 Download,
 Settings,
 ChevronDown,
 ChevronRight,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import Link from 'next/link'

const AGENT_URL = 'http://127.0.0.1:7777'

function YoutubeOfficialPanel() {
 const [account,setAccount]=useState<{configured?:boolean;connected?:boolean;channel?:{id:string;title:string;videoCount?:string}}|null>(null)
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0)
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[privacy,setPrivacy]=useState('private'),[kids,setKids]=useState('')
 const [file,setFile]=useState<File|null>(null),[confirmed,setConfirmed]=useState(false)
 const [receipt,setReceipt]=useState<{id:string;title:string;privacy:string;uploadStatus:string;processingStatus?:string;url:string}|null>(null)
 const [pendingId,setPendingId]=useState('')
 const sessionRef=useRef<{token:string;size:number}|null>(null)
 const [hasSession,setHasSession]=useState(false)
 async function load(){
  setError('')
  try{const r=await fetch('/api/youtube/channel',{cache:'no-store'}),j=await r.json();if(!r.ok)throw new Error(j.error||'연결 상태를 확인하지 못했습니다.');setAccount(j)}catch(e){setError(e instanceof Error?e.message:'연결 확인 실패')}
 }
 useEffect(()=>{
  void load().then(()=>{
   const result=new URLSearchParams(window.location.search).get('youtube')
   if(result&&result!=='connected')setError(result==='permission_required'?'채널 조회와 영상 업로드 권한을 모두 허용해 주세요.':result==='channel_required'?'선택한 Google 계정에 YouTube 채널이 없습니다.':'YouTube 연결이 완료되지 않았습니다. 로그인 상태와 연결 설정을 확인한 뒤 다시 연결해 주세요.')
  })
 },[])
 async function verify(id:string){
  const r=await fetch('/api/youtube/receipt?id='+encodeURIComponent(id),{cache:'no-store'}),j=await r.json()
  if(!r.ok)throw new Error(j.error||'접수 결과 확인 실패')
  setReceipt(j);setPendingId('')
 }
 async function disconnect(){
  if(!window.confirm('로컬루션에 저장된 YouTube 연결을 해제할까요? Google 계정 권한은 Google 설정에서 별도로 관리할 수 있습니다.'))return
  try{const r=await fetch('/api/youtube/channel',{method:'DELETE'}),j=await r.json();if(!r.ok)throw new Error(j.error);setAccount({configured:true,connected:false});sessionRef.current=null;setHasSession(false)}catch(e){setError(e instanceof Error?e.message:'연결 해제 실패')}
 }
 async function upload(){
  if(!file||!confirmed||!kids)return
  setBusy(true);setError('');setReceipt(null);setProgress(0)
  try{
   if(!sessionRef.current){
    const r=await fetch('/api/youtube/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description,privacy,madeForKids:kids==='yes',confirm:true,size:file.size,mime:file.type})}),j=await r.json()
    if(!r.ok)throw new Error(j.error||'업로드 준비 실패')
    sessionRef.current={token:j.session,size:j.chunkSize};setHasSession(true)
   }
   const session=sessionRef.current
   async function transfer(offset:number,probe=false):Promise<{complete:boolean;offset:number;id?:string}>{
    const r=await fetch('/api/youtube/upload/chunk'+(probe?'?probe=1':''),{method:'POST',headers:{'Content-Type':'application/octet-stream','x-upload-session':session!.token,'x-upload-offset':String(offset)},body:probe?new Blob([]):file!.slice(offset,Math.min(offset+session!.size,file!.size))})
    const j=await r.json();if(!r.ok)throw new Error(j.error||'전송 결과를 확인하지 못했습니다.')
    return j
   }
   let result=await transfer(0,true)
   while(!result.complete){
    const previous=result.offset
    result=await transfer(previous)
    if(!result.complete&&result.offset<=previous)throw new Error('전송 진행을 확인하지 못했습니다. 이어서 전송을 눌러 주세요.')
    setProgress(Math.round(result.offset/file.size*100))
   }
   if(!result.id)throw new Error('영상 식별자가 반환되지 않았습니다. YouTube Studio에서 확인해 주세요.')
   setPendingId(result.id);await verify(result.id)
  }catch(e){setError(e instanceof Error?e.message:'업로드 실패')}finally{setBusy(false)}
 }
 const input='w-full min-h-11 rounded-lg border border-[var(--lu-line)] bg-white p-3 text-base'
 return <section className="rounded-xl border border-[var(--lu-line)] bg-white p-4 sm:p-6 space-y-4">
  <div><h2 className="font-semibold text-lg">휴대폰에서 영상 올리기</h2><p className="text-sm text-[var(--lu-muted)] mt-1">내 YouTube 채널을 연결하고 영상 파일을 선택하세요. PC 프로그램 없이 안전하게 나누어 전송합니다.</p></div>
  {error&&<p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}
  {!account&&<button type="button" onClick={load} className={input}>연결 상태 다시 확인</button>}
  {account?.configured===false&&<p className="text-sm">관리자의 YouTube 연결 설정이 필요합니다. 설정 후 이 화면에서 채널을 연결할 수 있습니다.</p>}
  {account?.configured&&<div className="flex flex-wrap items-center gap-3"><p className="text-sm">{account.connected?account.channel?.title:'연결된 채널이 없습니다.'}</p><a href="/api/oauth/youtube" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm">{account.connected?'채널 다시 연결':'Google로 채널 연결'}</a><button type="button" onClick={load} className="min-h-11 px-3 text-sm">새로고침</button></div>}
  {account?.connected&&!busy&&!hasSession&&<button type="button" onClick={disconnect} className="min-h-11 text-sm underline">로컬루션 연결 해제</button>}
  {account?.connected&&<fieldset disabled={busy||hasSession} className="space-y-4 disabled:opacity-70">
   <label className="block text-sm">영상 파일<input type="file" accept="video/*" className={input+' mt-1'} onChange={e=>{setFile(e.target.files?.[0]||null);setReceipt(null);setConfirmed(false)}} /></label>
   <label className="block text-sm">영상 제목<input value={title} maxLength={100} onChange={e=>setTitle(e.target.value)} className={input+' mt-1'} /></label>
   <label className="block text-sm">영상 설명<textarea value={description} maxLength={5000} rows={4} onChange={e=>setDescription(e.target.value)} className={input+' mt-1'} /></label>
   <div className="grid sm:grid-cols-2 gap-3"><label className="block text-sm">공개 범위<select value={privacy} onChange={e=>{setPrivacy(e.target.value);setConfirmed(false)}} className={input+' mt-1'}><option value="private">비공개</option><option value="unlisted">일부 공개 · 링크가 있는 사람</option><option value="public">전체 공개</option></select></label><label className="block text-sm">아동용 영상 여부<select value={kids} onChange={e=>setKids(e.target.value)} className={input+' mt-1'}><option value="">직접 선택해 주세요</option><option value="no">아동용이 아닙니다</option><option value="yes">아동용입니다</option></select></label></div>
   <p className="text-xs text-[var(--lu-muted)]">업로드 완료 후 실제 공개 상태를 확인하세요. 업로드 중 화면을 유지해 주세요.</p>
   <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1" />내가 사용할 권한이 있는 영상이며 선택한 채널과 공개 범위로 업로드합니다.</label>
  </fieldset>}
  {account?.connected&&!receipt&&<button type="button" disabled={!file||!title.trim()||!kids||!confirmed||busy||Boolean(pendingId)} onClick={upload} className="w-full min-h-12 rounded-lg bg-[var(--lu-accent)] text-white font-semibold disabled:opacity-40">{busy?`전송 중 ${progress}%`:hasSession?'기존 영상 이어서 전송':'선택한 공개 범위로 업로드'}</button>}
  {hasSession&&!receipt&&<p className="text-xs text-[var(--lu-muted)]">이어서는 기존 접수 상태를 먼저 조회합니다. 화면을 닫으면 이어서 전송할 수 없으므로 YouTube Studio에서 접수 여부를 확인해 주세요.</p>}
  {busy&&<progress aria-label="영상 전송 진행률" value={progress} max={100} className="w-full" />}
  {pendingId&&!busy&&<button onClick={()=>verify(pendingId).catch(e=>setError(e.message))} className={input}>이미 전송한 영상의 접수 결과 다시 확인</button>}
  {receipt&&<div role="status" className="rounded-lg bg-[var(--lu-accent-soft)] p-4 text-sm space-y-2"><p className="font-semibold">{['failed','rejected','deleted'].includes(receipt.uploadStatus)||['failed','terminated'].includes(receipt.processingStatus||'')?'YouTube에서 영상 처리를 완료하지 못했습니다. Studio에서 사유를 확인해 주세요.':'내 채널의 영상 접수를 확인했습니다.'}</p><p>{receipt.title}</p><p>실제 공개 상태: {receipt.privacy==='private'?'비공개':receipt.privacy==='public'?'전체 공개':'일부 공개'}</p><p>업로드 상태: {receipt.uploadStatus} · 처리 상태: {receipt.processingStatus||'확인 중'}</p><a href={receipt.url} target="_blank" rel="noopener noreferrer" className="underline">YouTube에서 확인</a></div>}
  {receipt&&<button type="button" onClick={()=>{sessionRef.current=null;setHasSession(false);setFile(null);setTitle('');setDescription('');setReceipt(null);setConfirmed(false);setProgress(0)}} className={input}>새 영상 준비</button>}
  <a href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer" className="inline-block text-sm underline">YouTube Studio 열기</a>
 </section>
}

type AgentStatus = 'checking' | 'connected' | 'disconnected'
type UploadState = 'idle' | 'running' | 'success' | 'error'

export default function YoutubeCommunityPage() {
 const [agentStatus, setAgentStatus] = useState<AgentStatus>('disconnected')
 const [pcEnabled, setPcEnabled] = useState(false)
 const [channelUrl, setChannelUrl] = useState('')
 const [profileName, setProfileName] = useState('Default')
 const [postText, setPostText] = useState('')
 const [commentText, setCommentText] = useState('')
 const [imageFile, setImageFile] = useState<File | null>(null)
 const [imagePreview, setImagePreview] = useState<string | null>(null)
 const [uploadState, setUploadState] = useState<UploadState>('idle')
 const [logs, setLogs] = useState<string[]>([])
 const [showAdvanced, setShowAdvanced] = useState(false)
 // disconnected 상태일 때 자동으로 가이드 펼침 (사용자가 클릭 안 해도 즉시 안내 보임)
 const [showGuide, setShowGuide] = useState(true)

 const logsEndRef = useRef<HTMLDivElement>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 useEffect(() => {
 if (!pcEnabled) return
 checkAgent()
 const id = setInterval(checkAgent, 10_000)
 return () => clearInterval(id)
 }, [pcEnabled])

 useEffect(() => {
 logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 }, [logs])

 async function checkAgent() {
 if (!pcEnabled) return
 try {
 const res = await fetch(`${AGENT_URL}/health`, { signal: AbortSignal.timeout(2500) })
 setAgentStatus(res.ok ? 'connected' : 'disconnected')
 } catch {
 setAgentStatus('disconnected')
 }
 }

 function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0]
 if (!file) return
 setImageFile(file)
 const reader = new FileReader()
 reader.onloadend = () => setImagePreview(reader.result as string)
 reader.readAsDataURL(file)
 }

 function removeImage() {
 setImageFile(null)
 setImagePreview(null)
 if (fileInputRef.current) fileInputRef.current.value = ''
 }

 async function fileToBase64(file: File): Promise<string> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onloadend = () => resolve((reader.result as string).split(',')[1])
 reader.onerror = reject
 reader.readAsDataURL(file)
 })
 }

 async function handleUpload() {
 if (!channelUrl.trim() || !postText.trim() || !commentText.trim()) return
 if (agentStatus !== 'connected') return

 setUploadState('running')
 setLogs(['업로드를 시작합니다...'])

 let imageBase64: string | null = null
 let imageFilename: string | null = null
 if (imageFile) {
 try {
 imageBase64 = await fileToBase64(imageFile)
 imageFilename = imageFile.name
 } catch {
 setLogs(prev => [...prev, '이미지 변환 중 오류가 발생했습니다.'])
 setUploadState('error')
 return
 }
 }

 try {
 const res = await fetch(`${AGENT_URL}/upload`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 channel_url: channelUrl.trim(),
 post_text: postText,
 comment_text: commentText,
 profile_name: profileName || 'Default',
 image_base64: imageBase64,
 image_filename: imageFilename,
 }),
 })
 if (!res.ok) throw new Error(`에이전트 오류: ${res.status}`)

 const { task_id } = await res.json()
 const eventSource = new EventSource(`${AGENT_URL}/progress/${task_id}`)

 eventSource.onmessage = (e) => {
 const data = JSON.parse(e.data)
 if (data.type === 'log') setLogs(prev => [...prev, data.message])
 if (data.type === 'done') {
 eventSource.close()
 setUploadState(data.success ? 'success' : 'error')
 if (!data.success) setLogs(prev => [...prev, `실패: ${data.error || '알 수 없는 오류'}`])
 else setLogs(prev => [...prev, '모든 작업이 완료되었습니다!'])
 }
 }
 eventSource.onerror = () => {
 eventSource.close()
 setUploadState('error')
 setLogs(prev => [...prev, '에이전트와 연결이 끊어졌습니다.'])
 }
 } catch (err: any) {
 setUploadState('error')
 setLogs(prev => [...prev, `오류: ${err.message}`])
 }
 }

 const canUpload =
 agentStatus === 'connected' &&
 channelUrl.trim() &&
 postText.trim() &&
 commentText.trim() &&
 uploadState !== 'running'

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)]">
 <Sidebar />

 <div className="lu-channel-shell pt-[57px] md:pt-0 md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 variant="youtube"
 icon={<Youtube size={28} className="text-white" strokeWidth={2.5} />}
 title="YouTube 채널 관리"
 subtitle="휴대폰과 PC에서 채널을 연결하고 영상을 업로드하세요"
 />

 <main className="flex-1 px-4 md:px-6 py-6 max-w-5xl mx-auto w-full space-y-4">

 <YoutubeOfficialPanel />
 <section className="rounded-xl border border-[var(--lu-line)] bg-white p-4">
 <h2 className="font-semibold">PC 커뮤니티 도구</h2>
 <p className="text-sm text-[var(--lu-muted)] mt-2">커뮤니티 게시물 작성은 공식 YouTube API에서 지원하지 않습니다. 기존 PC 도구는 해당 PC에서 직접 실행해 사용하는 별도 기능입니다.</p>
 <button type="button" onClick={() => setPcEnabled(v => !v)} className="mt-3 min-h-11 rounded-lg border px-4">{pcEnabled ? 'PC 도구 닫기' : '이 PC의 에이전트 사용'}</button>
 </section>
 {pcEnabled && <>
 {/* 에이전트 연결 상태 */}
 <div className={
 'flex items-center justify-between px-4 py-3 rounded-[10px] border ' +
 (agentStatus === 'connected'
 ? 'bg-[#F0FDF4] border-[#BBF7D0]'
 : agentStatus === 'disconnected'
 ? 'bg-[#FFF1F2] border-[#FECDD3]'
 : 'bg-white border-[var(--lu-line)]')
 }>
 <div className="flex items-center gap-2.5">
 {agentStatus === 'connected' ? (
 <CheckCircle2 size={16} className="text-[#059669]" strokeWidth={2.5} />
 ) : agentStatus === 'disconnected' ? (
 <AlertCircle size={16} className="text-[#DC2626]" strokeWidth={2.5} />
 ) : (
 <RefreshCw size={14} className="text-[var(--lu-muted)] animate-spin" strokeWidth={2.5} />
 )}
 <span className={
 'text-sm font-semibold ' +
 (agentStatus === 'connected' ? 'text-[#059669]'
 : agentStatus === 'disconnected' ? 'text-[#DC2626]'
 : 'text-[var(--lu-muted)]')
 }>
 {agentStatus === 'connected' ? '에이전트 연결됨'
 : agentStatus === 'disconnected' ? '에이전트 미연결'
 : '연결 확인 중...'}
 </span>
 {agentStatus === 'disconnected' && (
 <span className="text-xs text-[var(--lu-muted)] hidden sm:inline">· 에이전트를 먼저 실행해 주세요</span>
 )}
 </div>
 <button
 onClick={checkAgent}
 className="min-h-11 flex items-center gap-1.5 text-xs text-[var(--lu-muted)] hover:text-[var(--lu-muted)] px-2.5 py-1.5 rounded-lg hover:bg-white transition-all"
 >
 <RefreshCw size={12} strokeWidth={2.5} />
 재확인
 </button>
 </div>

 {/* 미연결 시 실행 안내 */}
 {agentStatus === 'disconnected' && (
 <div className="rounded-[10px] border border-[#FECDD3] overflow-hidden">
 <button
 onClick={() => setShowGuide(v => !v)}
 className="min-h-11 w-full flex items-center justify-between px-4 py-3 bg-[#FFF1F2] hover:bg-[#FFE4E6] transition-colors text-left"
 >
 <div className="flex items-center gap-2">
 <div className="w-5 h-5 rounded-lg bg-[var(--lu-accent)] flex items-center justify-center flex-shrink-0">
 <Download size={11} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-semibold text-[#DC2626]">에이전트 실행 방법 보기</span>
 </div>
 <ChevronDown
 size={16}
 className={'text-[#DC2626] transition-transform ' + (showGuide ? 'rotate-180' : '')}
 strokeWidth={2.5}
 />
 </button>
 {showGuide && (
 <div className="px-4 py-4 bg-white space-y-3">
 {[
 { step: '1', title: '에이전트 파일 다운로드', desc: '아래 다운로드 페이지에서 yt_community_agent.exe 를 받으세요.' },
 { step: '2', title: 'yt_community_agent.exe 실행', desc: '파일을 더블클릭하면 터미널 창이 열리며 에이전트가 시작됩니다. 창을 닫지 마세요.' },
 { step: '3', title: '이 페이지에서 연결 확인', desc: '위쪽 상태 표시줄이 초록색 "에이전트 연결됨"으로 바뀌면 사용할 수 있습니다.' },
 ].map(({ step, title, desc }) => (
 <div key={step} className="flex items-start gap-3">
 <span className="w-5 h-5 rounded-full bg-[#FF0000] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
 <div>
 <p className="text-xs font-semibold text-[var(--lu-ink)]">{title}</p>
 <p className="text-[11px] text-[var(--lu-muted)] mt-0.5">{desc}</p>
 </div>
 </div>
 ))}
 <p className="text-[11px] text-[#B0B8C1] pt-2 border-t border-[var(--lu-canvas)]">
 에이전트는 내 PC에서만 실행되며 외부로 정보가 전송되지 않습니다.
 </p>
 <Link
 href="/marketing/youtube-community/download"
 className="flex items-center justify-center gap-1.5 w-full mt-1 py-2.5 rounded-[6px] bg-[var(--lu-accent)] text-white text-xs font-bold hover:from-red-600 hover:to-red-700 transition-all"
 >
 <Download size={12} strokeWidth={2.5} />
 다운로드 페이지로 이동
 <ChevronRight size={11} strokeWidth={2.5} />
 </Link>
 </div>
 )}
 </div>
 )}

 {/* 메인 그리드 */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">

 {/* 왼쪽: 입력 폼 */}
 <div className="space-y-4">

 {/* 채널 설정 */}
 <div className="bg-white rounded-[10px] shadow-none border border-[var(--lu-line)] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent)] flex items-center justify-center flex-shrink-0">
 <Link2 size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">채널 설정</span>
 </div>

 <div className="space-y-3">
 <div>
 <label className="block text-xs font-semibold text-[var(--lu-muted)] mb-1.5">
 채널 URL <span className="text-[#DC2626]">*</span>
 </label>
 <input
 type="url"
 value={channelUrl}
 onChange={e => setChannelUrl(e.target.value)}
 placeholder="https://www.youtube.com/@내채널"
 className="min-h-11 w-full px-3 py-2.5 text-base rounded-[6px] border border-[var(--lu-line)] focus:outline-none focus:ring-2 focus:ring-[#FF0000]/20 focus:border-[#FF0000] transition-all bg-[var(--lu-canvas)] placeholder:text-[#B0B8C1]"
 />
 </div>

 <button
 onClick={() => setShowAdvanced(v => !v)}
 className="min-h-11 flex items-center gap-1.5 text-xs text-[var(--lu-muted)] hover:text-[var(--lu-muted)] transition-colors"
 >
 <Settings size={11} strokeWidth={2.5} />
 고급 설정 {showAdvanced ? '닫기' : '(크롬 프로필)'}
 </button>

 {showAdvanced && (
 <div>
 <label className="block text-xs font-semibold text-[var(--lu-muted)] mb-1.5">크롬 프로필 이름</label>
 <input
 type="text"
 value={profileName}
 onChange={e => setProfileName(e.target.value)}
 placeholder="Default"
 className="min-h-11 w-full px-3 py-2.5 text-base rounded-[6px] border border-[var(--lu-line)] focus:outline-none focus:ring-2 focus:ring-[var(--lu-accent)]/20 focus:border-[var(--lu-accent)] transition-all bg-[var(--lu-canvas)]"
 />
 <p className="text-[11px] text-[#B0B8C1] mt-1.5">
 chrome://version/ 에서 Profile Path 마지막 폴더명 확인
 </p>
 </div>
 )}
 </div>
 </div>

 {/* 게시물 본문 */}
 <div className="bg-white rounded-[10px] shadow-none border border-[var(--lu-line)] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent)] flex items-center justify-center flex-shrink-0">
 <Youtube size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">게시물 본문</span>
 <span className="text-[#DC2626] text-xs ml-0.5">*</span>
 </div>
 <textarea
 value={postText}
 onChange={e => setPostText(e.target.value)}
 rows={5}
 placeholder="커뮤니티 탭에 올릴 내용을 입력하세요..."
 className="w-full px-3 py-2.5 text-base rounded-[6px] border border-[var(--lu-line)] focus:outline-none focus:ring-2 focus:ring-[#FF0000]/20 focus:border-[#FF0000] transition-all bg-[var(--lu-canvas)] placeholder:text-[#B0B8C1] resize-none"
 />
 <p className="text-[11px] text-[#B0B8C1] mt-1.5 text-right">{postText.length}자</p>
 </div>

 {/* 이미지 첨부 */}
 <div className="bg-white rounded-[10px] shadow-none border border-[var(--lu-line)] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent)] flex items-center justify-center flex-shrink-0">
 <ImageIcon size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">이미지 첨부</span>
 <span className="text-xs text-[var(--lu-muted)]">(선택사항)</span>
 </div>

 {imagePreview ? (
 <div className="relative">
 <img
 src={imagePreview}
 alt="첨부 이미지 미리보기"
 className="w-full max-h-44 object-cover rounded-[6px] border border-[var(--lu-line)]"
 />
 <button
 onClick={removeImage}
 className="min-h-11 absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#FFF1F2] transition-colors"
 >
 <X size={12} className="text-[#DC2626]" strokeWidth={2.5} />
 </button>
 <p className="text-[11px] text-[var(--lu-muted)] mt-1.5">{imageFile?.name}</p>
 </div>
 ) : (
 <button
 onClick={() => fileInputRef.current?.click()}
 className="min-h-11 w-full h-20 rounded-[6px] border-2 border-dashed border-[var(--lu-line)] flex flex-col items-center justify-center gap-1.5 hover:border-[var(--lu-accent)] hover:bg-[var(--lu-accent-soft)] transition-all group"
 >
 <Upload size={16} className="text-[#B0B8C1] group-hover:text-[var(--lu-accent)]" strokeWidth={2} />
 <span className="text-xs text-[#B0B8C1] group-hover:text-[var(--lu-accent)]">클릭하여 이미지 선택</span>
 </button>
 )}
 <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="min-h-11 hidden" />
 </div>

 {/* 고정 댓글 */}
 <div className="bg-white rounded-[10px] shadow-none border border-[var(--lu-line)] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent)] flex items-center justify-center flex-shrink-0">
 <MessageSquare size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">고정 댓글</span>
 <span className="text-[#DC2626] text-xs ml-0.5">*</span>
 </div>
 <input
 type="text"
 value={commentText}
 onChange={e => setCommentText(e.target.value)}
 placeholder="게시물에 자동으로 달리고 고정될 첫 번째 댓글"
 className="min-h-11 w-full px-3 py-2.5 text-base rounded-[6px] border border-[var(--lu-line)] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all bg-[var(--lu-canvas)] placeholder:text-[#B0B8C1]"
 />
 </div>

 {/* 업로드 버튼 */}
 <button
 onClick={handleUpload}
 disabled={!canUpload}
 className={
 'w-full py-3.5 rounded-[10px] text-sm font-semibold transition-all flex items-center justify-center gap-2 ' +
 (canUpload
 ? 'bg-[var(--lu-accent)] text-white shadow-none hover:shadow-md active:scale-[0.99]'
 : 'bg-[var(--lu-canvas)] text-[#B0B8C1] cursor-not-allowed')
 }
 >
 {uploadState === 'running' ? (
 <><RefreshCw size={15} className="animate-spin" strokeWidth={2.5} />업로드 진행 중...</>
 ) : (
 <><Upload size={15} strokeWidth={2.5} />자동 업로드 시작</>
 )}
 </button>

 {agentStatus === 'disconnected' && (
 <p className="text-xs text-center text-[#DC2626]">에이전트가 실행 중이어야 업로드가 가능합니다.</p>
 )}
 </div>

 {/* 오른쪽: 진행 로그 + 설치 안내 */}
 <div className="space-y-4">

 {/* 진행 로그 */}
 <div className="bg-white rounded-[10px] shadow-none border border-[var(--lu-line)] overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--lu-canvas)]">
 <span className="text-sm font-bold text-[var(--lu-ink)]">진행 상태</span>
 {uploadState === 'success' && (
 <span className="flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
 <CheckCircle2 size={13} strokeWidth={2.5} />완료
 </span>
 )}
 {uploadState === 'error' && (
 <span className="flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
 <AlertCircle size={13} strokeWidth={2.5} />오류
 </span>
 )}
 {uploadState === 'running' && (
 <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lu-accent)]">
 <RefreshCw size={13} className="animate-spin" strokeWidth={2.5} />실행 중
 </span>
 )}
 </div>
 <div className="h-64 md:h-72 overflow-y-auto p-4 bg-[#FAFAFA] font-mono text-xs space-y-1.5">
 {logs.length === 0 ? (
 <p className="text-[#B0B8C1] text-center mt-14">업로드를 시작하면 진행 상황이 표시됩니다.</p>
 ) : (
 logs.map((log, i) => (
 <div key={i} className="flex items-start gap-2">
 <span className="text-[#B0B8C1] flex-shrink-0 select-none">{String(i + 1).padStart(2, '0')}.</span>
 <span className={
 log.includes('오류') || log.includes('실패') ? 'text-[#DC2626]'
 : log.includes('완료') || log.includes('성공') ? 'text-[#059669]'
 : 'text-[var(--lu-muted)]'
 }>{log}</span>
 </div>
 ))
 )}
 <div ref={logsEndRef} />
 </div>
 </div>

 {/* 에이전트 설치 안내 */}
 <div id="download" className="bg-white rounded-[10px] shadow-none border border-[var(--lu-line)] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-[6px] bg-[var(--lu-accent)] flex items-center justify-center flex-shrink-0">
 <Download size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[var(--lu-ink)]">에이전트 설치 안내</span>
 </div>

 <div className="space-y-3">
 {[
 { step: '1', title: '에이전트 파일 다운로드', desc: '담당자에게 문의하거나 공유된 링크에서 받으세요.' },
 { step: '2', title: 'yt_community_agent.exe 실행', desc: '더블클릭하면 터미널 창이 열리며 에이전트가 시작됩니다.' },
 { step: '3', title: '이 페이지에서 업로드', desc: '위쪽에 "에이전트 연결됨" 초록 표시 확인 후 사용하세요.' },
 ].map(({ step, title, desc }) => (
 <div key={step} className="flex items-start gap-3">
 <span className="w-5 h-5 rounded-full bg-[var(--lu-accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
 <div>
 <p className="text-xs font-semibold text-[var(--lu-ink)]">{title}</p>
 <p className="text-[11px] text-[var(--lu-muted)] mt-0.5">{desc}</p>
 </div>
 </div>
 ))}
 <p className="text-[11px] text-[#B0B8C1] pt-1 border-t border-[var(--lu-canvas)]">
 에이전트는 내 PC에서만 실행되며 외부로 정보가 전송되지 않습니다.
 </p>
 </div>
 </div>
 </div>
 </div>
 </>}
 </main>

 <Footer />
 </div>
 </div>
 )
}
