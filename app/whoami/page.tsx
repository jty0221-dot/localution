// app/whoami/page.tsx — 관리자 인증 진단 (LU-018)
// ============================================================
// · 서버 컴포넌트. 관리자 검사는 서버의 requireAdmin() (adminAuth.ts · admin-emails.ts 원천) 로 한다.
// · 예전에는 'use client' 화면이 관리자 이메일 4개를 번들에 하드코딩하고 쿠키 원문을 화면에 찍었다.
//   → 클라이언트 번들에서 이메일 목록 제거 · 쿠키 값은 출력하지 않고 '서명 유효/무효' 판정만 보여준다.
// · 관리자가 아니면 이메일 · 쿠키 정보 없이 안내 문구만 렌더한다.
// ============================================================
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { requireAdmin } from '@/app/lib/adminAuth'
import { verifyCookie } from '@/app/lib/cookieSigning'

export const dynamic = 'force-dynamic'

export default async function AdminWhoAmI() {
  const admin = await requireAdmin()

  if (!admin.ok) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <section className="bg-white rounded-2xl p-6 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#DC2626] shadow-sm ring-1 ring-black/5 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-[#191F28]">관리자만 볼 수 있는 화면이에요</h1>
              <p className="text-sm text-[#8B95A1] mt-1">관리자 계정으로 로그인한 뒤 다시 열어주세요.</p>
              <Link href="/login?redirect=/whoami" className="inline-block mt-3 bg-[#3182F6] text-white text-sm font-bold px-4 py-2 rounded-xl">
                로그인
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const store = await cookies()
  const all = store.getAll()
  const luRaw = store.get('localution_user')?.value
  let luSignature: '서명 유효' | '서명 무효' | '쿠키 없음' = '쿠키 없음'
  if (luRaw) {
    let valid = false
    try { valid = !!verifyCookie(luRaw) } catch { valid = false }
    luSignature = valid ? '서명 유효' : '서명 무효'
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white rounded-2xl p-6">
          <h1 className="text-xl font-black">WhoAmI · 관리자 인증 진단</h1>
          <p className="text-white/80 text-xs mt-1">서버에서 확인한 현재 세션 정보예요. 쿠키 값은 표시하지 않아요.</p>
        </header>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#059669] to-[#3182F6] shadow-sm ring-1 ring-black/5 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" strokeWidth={2.5} />
            </span>
            <span>관리자 확인 통과</span>
          </h2>
          <div className="space-y-2 text-sm">
            <Row k="email" v={admin.email} highlight />
            <Row k="인증 경로" v={admin.source === 'localution' ? 'OAuth (localution_user 쿠키)' : 'Supabase Auth'} />
            <Row k="localution_user" v={luSignature} highlight={luSignature === '서명 유효'} />
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold mb-3">쿠키 목록 (이름과 길이만)</h2>
          <div className="space-y-1 text-xs font-mono">
            {all.length === 0 ? (
              <span className="text-[#8B95A1]">쿠키 없음</span>
            ) : all.map((c) => (
              <div key={c.name} className="flex gap-2">
                <span className={c.name.startsWith('localution_') || c.name.startsWith('sb-') ? 'font-bold text-[#3182F6]' : 'text-[#4E5968]'}>
                  {c.name}
                </span>
                <span className="text-[#8B95A1]">· {c.value.length}B</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-2">
          <Link href="/admin/dashboard" className="flex-1 bg-[#3182F6] text-white text-center py-3 rounded-xl font-bold text-sm">
            /admin/dashboard 열기 →
          </Link>
          <Link href="/login" className="flex-1 bg-white border border-[#E5E8EB] text-[#4E5968] text-center py-3 rounded-xl font-bold text-sm">
            다시 로그인
          </Link>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-[#8B95A1] w-32 flex-shrink-0 text-xs pt-0.5">{k}</span>
      <span className={`text-sm break-all ${highlight ? 'font-bold text-[#059669]' : 'text-[#191F28]'}`}>
        {v}
      </span>
    </div>
  )
}
