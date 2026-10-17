'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
type StoredReview = { id: string; author_mask?: string; author_name?: string; rating: number | null; content: string; posted_at: string | null; has_reply: boolean }
export default function GoogleReviewPage(){
 const [reviews,setReviews]=useState<StoredReview[]>([])
 const [ready,setReady]=useState(false)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [loginRequired,setLoginRequired]=useState(false)
 const [checkedAt,setCheckedAt]=useState('')
 const busy=useRef(false)
 const active=useRef<AbortController|null>(null)
 async function load(){
 if(busy.current)return
 busy.current=true;setLoading(true);setError('');setLoginRequired(false)
 const controller=new AbortController();active.current=controller
 const timer=setTimeout(()=>controller.abort(),12000)
 try{
 const response=await fetch('/api/place/reviews?platform=google&limit=100',{credentials:'include',cache:'no-store',signal:controller.signal})
 if(response.status===401){setLoginRequired(true);setReviews([]);setReady(false);setCheckedAt('')}
 const data=await response.json()
 if(!response.ok||!data.ok||!Array.isArray(data.reviews))throw new Error(response.status===401?'로그인한 뒤 내 매장의 수집 리뷰를 확인해주세요.':'수집된 Google 리뷰를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해주세요.')
 if(controller.signal.aborted)return
 setReviews(data.reviews);setReady(true);setCheckedAt(new Date().toLocaleString('ko-KR'))
 }catch(reason){if(active.current===controller)setError(controller.signal.aborted?'조회가 지연되고 있어요. 다시 시도해주세요.':reason instanceof Error?reason.message:'리뷰 조회에 연결하지 못했어요.')}
 finally{clearTimeout(timer);if(active.current===controller){busy.current=false;setLoading(false);active.current=null}}
 }
 useEffect(()=>{void load();return()=>{active.current?.abort();active.current=null;busy.current=false}},[])
 return <div className="min-h-screen bg-[var(--lu-canvas)]"><Sidebar/><div className="md:ml-[220px] flex min-h-screen flex-col"><PageHeader icon={<Globe size={28}/>} title="Google 리뷰" subtitle="내 계정에 실제 수집된 리뷰만 확인하세요."/><main className="mx-auto w-full max-w-4xl flex-1 p-5"><section className="lu-panel p-5"><h1 className="text-xl font-semibold">수집된 Google 리뷰</h1><p className="mt-3 text-sm leading-7 text-[var(--lu-muted)]">연결되어 있어도 아직 수집한 리뷰가 없을 수 있어요. 이 화면에서는 새로운 수집이나 답글 게시를 실행하지 않아요.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={load} disabled={loading} className="lu-primary disabled:opacity-50">{loading?'확인 중':'저장된 리뷰 다시 확인'}</button><Link href="/my/platforms" className="inline-flex min-h-11 items-center px-3 text-sm text-[var(--lu-accent)]">플랫폼 연결 확인</Link><a href="https://business.google.com/reviews/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-3 text-sm underline">Google에서 직접 확인 · 새 창</a></div>{checkedAt&&<p className="mt-3 text-xs text-[var(--lu-muted)]">마지막 목록 조회: {checkedAt} · 실제 리뷰 작성일과 수집일은 별도예요.</p>}</section>{error&&<div role="alert" className="mt-4 rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{ready&&' 마지막으로 불러온 리뷰를 유지했어요.'}{loginRequired&&<Link href="/login?next=/review-admin/google" className="block min-h-11 py-3 underline">로그인하기</Link>}</div>}{loading&&!ready&&<p role="status" className="p-5 text-sm">리뷰를 확인하고 있어요.</p>}{ready&&reviews.length===0&&<p role="status" className="lu-panel mt-4 p-5 text-sm text-[var(--lu-muted)]">아직 수집된 Google 리뷰가 없어요. 플랫폼 연결과 수집 상태를 확인해주세요.</p>}<div className="mt-4 space-y-3">{reviews.map(review=><article key={review.id} className="lu-panel p-5"><p className="text-sm font-semibold">{review.author_mask||review.author_name||'익명'}{typeof review.rating==='number'&&<span className="ml-3 font-normal">평점 {review.rating} / 5</span>}</p>{review.posted_at&&<p className="mt-2 text-xs text-[var(--lu-muted)]">작성일 {review.posted_at}</p>}<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{review.content||'내용이 없는 리뷰예요.'}</p><p className="mt-3 text-xs text-[var(--lu-muted)]">{review.has_reply?'수집 정보상 답글 있음':'수집 정보상 답글 없음'} · 현재 상태는 Google에서 확인해주세요.</p></article>)}</div></main><Footer/></div></div>
}
