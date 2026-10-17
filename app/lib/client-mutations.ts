export async function requestMutation<T extends { ok: boolean }>(
  url: string, method: 'POST' | 'PUT', body: unknown, message: string,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('인터넷 연결을 확인한 뒤 다시 시도해주세요.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || data.ok !== true) {
    throw new Error(response.status === 401 ? '로그인 상태를 확인한 뒤 다시 시도해주세요.' : message)
  }
  return data as T
}

export function smsBodyForRecipients(message: string, names: string[]): string {
  if (names.length > 1 && message.includes('{고객명}')) {
    throw new Error('고객명 맞춤 문자는 한 분씩 준비해주세요. 여러 분께 보낼 때는 고객명 표시를 지워주세요.')
  }
  return message.replace(/\{고객명\}/g, names[0] || '고객')
}
