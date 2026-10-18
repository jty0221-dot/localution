'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowLeft, type LucideIcon } from 'lucide-react'
import styles from './AdminShell.module.css'

type AdminNavItem = { href: string; label: string; Icon: LucideIcon }
export default function AdminShell({ children, pathname, items }: { children: ReactNode; pathname: string; items: AdminNavItem[] }) {
 const [open, setOpen] = useState(false)
 const toggleRef = useRef<HTMLButtonElement>(null)
 const dialogRef = useRef<HTMLElement>(null)
 const current = items.find(item => pathname === item.href || pathname.startsWith(item.href + '/'))
 useEffect(() => { setOpen(false) }, [pathname])
 useEffect(() => {
  if (!open) return
  const previous = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialogRef.current?.querySelector<HTMLElement>('a,button')?.focus()
  const key = (event: KeyboardEvent) => {
   if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus() }
   if (event.key !== 'Tab') return
   const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')
   if (!nodes?.length) return
   const first = nodes[0], last = nodes[nodes.length - 1]
   if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
   else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  document.addEventListener('keydown', key)
  return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', key) }
 }, [open])
 const links = <nav aria-label="관리자 메뉴" className={styles.links}>{items.map(item => {
  const active = pathname === item.href || pathname.startsWith(item.href + '/')
  return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)} className={active ? styles.active : ''}><item.Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{item.label}</span></Link>
 })}</nav>
 const brand = <Link href="/admin/dashboard" className={styles.brand}><img src="/brand/localution-mark-20261018.png" width={32} height={32} alt="" /><span>로컬루션<strong>관리자</strong></span></Link>
 return <div className={styles.shell}>
  <a href="#admin-content" className={styles.skip}>본문으로 이동</a>
  <aside className={styles.desktop}>{brand}{links}<Link className={styles.back} href="/dashboard"><ArrowLeft size={16} />서비스로 돌아가기</Link></aside>
  <div className={styles.workspace}><header className={styles.header}><div><p>관리자 작업 공간</p><strong>{current?.label || '관리자 상세'}</strong></div><button ref={toggleRef} type="button" className={styles.menuButton} aria-expanded={open} aria-controls="admin-mobile-menu" aria-label="관리자 메뉴 열기" onClick={() => setOpen(true)}><Menu size={20} />메뉴</button><Link href="/help/videos" className={styles.help}>기능 안내</Link></header>
  <main id="admin-content" className={styles.content}>{children}</main></div>
  {open && <div className={styles.overlay} onClick={() => { setOpen(false); toggleRef.current?.focus() }}><aside id="admin-mobile-menu" className={styles.mobile} role="dialog" aria-modal="true" aria-label="관리자 메뉴" ref={dialogRef} onClick={event => event.stopPropagation()}><div className={styles.mobileBrand}>{brand}<button type="button" aria-label="관리자 메뉴 닫기" onClick={() => { setOpen(false); toggleRef.current?.focus() }}><X size={20} /></button></div>{links}<Link className={styles.back} href="/dashboard">서비스로 돌아가기</Link></aside></div>}
 </div>
}
