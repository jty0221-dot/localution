/** Reports success only after the browser confirms a copy operation. */
export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* Try the browser's synchronous fallback without changing the source. */ }
  const previousFocus = document.activeElement as HTMLElement | null
  const selection = window.getSelection?.()
  const ranges: Range[] = []
  if (selection) for (let i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange())
  const input = document.createElement('textarea')
  input.value = text
  input.readOnly = true
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  input.style.top = '0'
  try {
    document.body.appendChild(input)
    input.focus()
    input.select()
    input.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } catch {
    return false
  } finally {
    try { input.remove() } catch { /* Cleanup must not overwrite the copy result. */ }
    try { previousFocus?.focus?.({ preventScroll: true }) } catch { /* Focus restoration is best effort. */ }
    try {
      if (selection && ranges.length) {
        selection.removeAllRanges()
        for (const range of ranges) selection.addRange(range)
      }
    } catch { /* Selection restoration is best effort. */ }
  }
}
