/** Preserve campaign parameters and fragments without duplicate signup modes. */
export function signupDestination(search: string, hash = ''): string {
  const params = new URLSearchParams(search)
  params.set('mode', 'signup')
  return `/login?${params.toString()}${hash.startsWith('#') ? hash : ''}`
}
