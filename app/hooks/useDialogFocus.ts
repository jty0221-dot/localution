import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Keeps keyboard focus inside an open dialog and returns it to its opener. */
export function useDialogFocus(open: boolean, onClose: () => void, initialSelector?: string) {
 const dialogRef = useRef<HTMLDivElement>(null)
 const closeRef = useRef(onClose)
 closeRef.current = onClose
 useEffect(() => {
 if (!open || !dialogRef.current) return
 const dialog = dialogRef.current
 const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
 const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true')
 const focusFirst = () => (dialog.querySelector<HTMLElement>(initialSelector || '[data-dialog-initial-focus]') || controls()[0] || dialog).focus()
 focusFirst()
 const keydown = (event: KeyboardEvent) => {
 if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return }
 if (event.key !== 'Tab') return
 const items = controls()
 const first = items[0], last = items[items.length - 1]
 if (!first) { event.preventDefault(); dialog.focus(); return }
 if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
 else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
 }
 const focusin = (event: FocusEvent) => { if (!dialog.contains(event.target as Node)) focusFirst() }
 document.addEventListener('keydown', keydown, true)
 document.addEventListener('focusin', focusin)
 return () => {
 document.removeEventListener('keydown', keydown, true)
 document.removeEventListener('focusin', focusin)
 if (opener?.isConnected) opener.focus()
 }
 }, [open, initialSelector])
 return dialogRef
}
