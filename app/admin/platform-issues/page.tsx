// app/admin/platform-issues/page.tsx
// ============================================================
// v38: 시스템 전체 플랫폼 이슈 한눈에 보기 — 모바일 최적화
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/app/components/PageHeader'
import {
  AlertTriangle, RefreshCw, Users, Link2, Activity, ShieldAlert, Clock, UserX,
} from 'lucide-react'

type Overview = {
  summary?: {
    failed_credentials_count: number
    null_place_id_count: number
    failed_replies_24h: number
    stuck_queued_count: number
    // LU-018 W2-4 · 스탬프 → 고객 자동 등록 실패 (null = 집계 실패)
    crm_sync_failed_24h?: number | null
  }
  crm_sync_failed_reasons?: Record<string, number>
  platform_counts?: Record<string, { total: number; success: number; failed: number; disabled: number; never: number }>
  failed_replies_pattern?: Record<string, number>
  failed_credentials_users?: Array<{ user_id: string; issues: any[] }>
  null_place_id_users?: Array<{ user_id: string; platform: string }>
  stuck_queued_sample?: Array<{ user_id: string; platform: string; queued_at: string }>
  collection_health?: Array<{ store: string; platform: string; login_status: string; last_login_at: string | null; last_collected_at: string | null; collected_7d: number; state: string; ok: boolean }>
}

const PLATFORM_LABEL: Record<string, string> = {
  naver_place: '네이버', baemin: '배민', yogiyo: '요기요', coupangeats: '쿠팡이츠', kakao: '카카오', kakao_map: '카카오', google: '구글',
}
const fmtKst = (iso: string | null) => iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

export default function PlatformIssuesPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/platform-issues-overview?_t=' + Date.now(), { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setData(j)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 30000)
    return () => clearInterval(t)
  }, [])

  const s = data?.summary || { failed_credentials_count: 0, null_place_id_count: 0, failed_replies_24h: 0, stuck_queued_count: 0 }
  const pc = data?.platform_counts || {}
  const platforms = Object.keys(pc).sort()

  return (
    <div className="min-h-screen bg-[var(--lu-canvas)]">
      <PageHeader
        title="플랫폼 이슈 모니터"
        subtitle="자격증명/누락/적체/실패 전체 한눈에"
        icon={<ShieldAlert size={24} className="text-white" strokeWidth={2.5} />}
        variant="warn"
        badge="ADMIN"
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* 요약 카드 5개 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SumCard label="자격증명 오류" value={s.failed_credentials_count} icon={ShieldAlert} color="from-red-500 to-rose-600" highlight={s.failed_credentials_count > 0} />
          <SumCard label="매장ID 누락" value={s.null_place_id_count} icon={Link2} color="from-amber-500 to-orange-600" highlight={s.null_place_id_count > 5} />
          <SumCard label="24h 답글 실패" value={s.failed_replies_24h} icon={AlertTriangle} color="from-purple-500 to-violet-600" highlight={s.failed_replies_24h > 5} />
          <SumCard label="정체 답글" value={s.stuck_queued_count} icon={Clock} color="from-blue-500 to-indigo-600" highlight={s.stuck_queued_count > 0} />
          <SumCard label="24h 고객 자동등록 실패" value={s.crm_sync_failed_24h === null ? '확인 불가' : (s.crm_sync_failed_24h ?? 0)} icon={UserX} color="from-slate-500 to-slate-700" highlight={(s.crm_sync_failed_24h ?? 0) > 0} />
        </div>

        {/* 새로고침 */}
        <div className="flex justify-end">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침 (30s 자동)
          </button>
        </div>

        {/* 연동 · 수집 상태 — 로그인 성공과 실제 수집을 나란히 */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-none p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
              <Activity size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-base md:text-lg font-bold text-gray-900">연동 · 수집 상태</div>
              <div className="text-xs text-gray-500">로그인 성공이어도 리뷰가 안 들어오면 위쪽에 표시돼요. 새 리뷰가 실제로 없는 매장도 'N일째 없음'으로 보일 수 있어요.</div>
            </div>
          </div>
          <div className="space-y-2">
            {(data?.collection_health || []).length === 0 ? (
              <div className="text-sm text-gray-400 py-3 text-center">데이터 없음</div>
            ) : (data?.collection_health || []).map((c, i) => (
              <div key={i} className={'rounded-lg border px-3 py-2 text-xs md:text-sm ' + (c.ok ? 'border-gray-100' : 'border-amber-200 bg-amber-50')}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-gray-900 break-all">{c.store}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">{PLATFORM_LABEL[c.platform] || c.platform}</span>
                  <span className={'font-semibold ' + (c.ok ? 'text-emerald-700' : 'text-amber-800')}>{c.state}</span>
                </div>
                <div className="mt-1 text-gray-500 flex flex-wrap gap-x-3">
                  <span>마지막 수집 {fmtKst(c.last_collected_at)}</span>
                  <span>7일 수집 {c.collected_7d}건</span>
                  <span className="break-all">로그인 {c.login_status} · {fmtKst(c.last_login_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 플랫폼별 사용자 카운트 */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-none p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
              <Users size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base md:text-lg font-bold text-gray-900">플랫폼별 사용자 상태</div>
              <div className="text-xs text-gray-500">last_login_status 기준</div>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-xs md:text-sm min-w-[480px]">
              <thead className="text-left text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2">플랫폼</th>
                  <th className="px-2 py-2 text-center">전체</th>
                  <th className="px-2 py-2 text-center text-emerald-600">성공</th>
                  <th className="px-2 py-2 text-center text-red-600">실패</th>
                  <th className="px-2 py-2 text-center text-gray-500">미확인</th>
                </tr>
              </thead>
              <tbody>
                {platforms.length === 0 ? (
                  <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-400">데이터 없음</td></tr>
                ) : platforms.map(p => (
                  <tr key={p} className="border-b border-gray-100">
                    <td className="px-2 py-2 font-bold text-gray-900">{p}</td>
                    <td className="px-2 py-2 text-center">{pc[p].total}</td>
                    <td className="px-2 py-2 text-center text-emerald-600 font-semibold">{pc[p].success}</td>
                    <td className="px-2 py-2 text-center text-red-600 font-semibold">{pc[p].failed}</td>
                    <td className="px-2 py-2 text-center text-gray-500">{pc[p].never + pc[p].disabled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 매장 ID 누락 사용자 */}
        {data?.null_place_id_users && data.null_place_id_users.length > 0 && (
          <div className="bg-white rounded-[10px] border border-amber-200 shadow-none p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
                <Link2 size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base md:text-lg font-bold text-gray-900">매장 ID 누락 사용자</div>
                <div className="text-xs text-gray-500">{data.null_place_id_users.length}건 · 답글 발행 불가 상태</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.null_place_id_users.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-2 md:p-3 bg-amber-50 rounded-lg text-xs md:text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-gray-600 truncate">{u.user_id}</span>
                    <span className="px-2 py-0.5 bg-white border border-amber-200 rounded-md text-xs md:text-xs font-medium text-amber-700">
                      {u.platform}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-3">
              해결: naver_place 는 <code className="bg-amber-100 px-1 rounded">/api/admin/sync-naver-store-ids?dry=0</code> 호출. 기타는 사용자에게 재연결 요청.
            </p>
          </div>
        )}

        {/* 정체 답글 */}
        {data?.stuck_queued_sample && data.stuck_queued_sample.length > 0 && (
          <div className="bg-white rounded-[10px] border border-blue-200 shadow-none p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
                <Clock size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base md:text-lg font-bold text-gray-900">정체 답글</div>
                <div className="text-xs text-gray-500">{data.stuck_queued_sample.length}건 · 30분+ 처리 안 됨</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.stuck_queued_sample.slice(0, 10).map((u, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-xs md:text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-gray-600 truncate">{u.user_id}</span>
                    <span className="px-2 py-0.5 bg-white border border-blue-200 rounded-md text-xs md:text-xs font-medium text-blue-700">
                      {u.platform}
                    </span>
                  </div>
                  <span className="text-xs md:text-xs text-gray-500 flex-shrink-0">
                    {new Date(u.queued_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-700 mt-3">
              해결: <a href="/admin/queue-control" className="font-bold underline">/admin/queue-control</a> 의 "prioritized → waiting 변환" 또는 retry-queued-replies 호출.
            </p>
          </div>
        )}

        {/* 답글 실패 패턴 */}
        {data?.failed_replies_pattern && Object.keys(data.failed_replies_pattern).length > 0 && (
          <div className="bg-white rounded-[10px] border border-purple-200 shadow-none p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
                <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base md:text-lg font-bold text-gray-900">24h 답글 실패 패턴</div>
                <div className="text-xs text-gray-500">실패 원인 분류</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {Object.entries(data.failed_replies_pattern).sort((a, b) => b[1] - a[1]).map(([pattern, count]) => (
                <div key={pattern} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg text-xs md:text-sm">
                  <span className="font-medium text-gray-900">{pattern}</span>
                  <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-xs md:text-xs font-bold">
                    {count}건
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 스탬프 → 고객 자동 등록 실패 원인 (LU-018 W2-4) */}
        {data?.crm_sync_failed_reasons && Object.keys(data.crm_sync_failed_reasons).length > 0 && (
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-none p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--lu-accent)] shadow-none flex items-center justify-center">
                <UserX size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base md:text-lg font-bold text-gray-900">24h 고객 자동등록 실패 원인</div>
                <div className="text-xs text-gray-500">owner_key_uuid = 고객 표 소유 키 마이그레이션 실행 전 (OAuth 사장님)</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {Object.entries(data.crm_sync_failed_reasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs md:text-sm">
                  <span className="font-medium text-gray-900">{reason}</span>
                  <span className="px-2 py-0.5 bg-gray-700 text-white rounded-md text-xs font-bold">{count}건</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안내 박스 */}
        <div className="bg-[var(--lu-accent)] rounded-[10px] border border-emerald-200 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-emerald-600" />
            <div className="text-sm md:text-base font-bold text-emerald-900">자동 모니터링</div>
          </div>
          <ul className="text-xs md:text-sm text-emerald-900 space-y-1.5">
            <li>· 15분마다 큐 자동 청소 (`/api/cron/queue-maintenance`)</li>
            <li>· 30분마다 모든 플랫폼 리뷰 자동 수집</li>
            <li>· 4시간마다 AI 답글 초안 자동 생성 (autoreply 활성 사용자만)</li>
            <li>· 자격증명 오류 시 사장님 dashboard 에 자동 배너 표시</li>
            <li>· 답글 실패 패턴 분석 → silent reject 대응 (250자 자동 truncate)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function SumCard({ label, value, icon: Icon, color, highlight }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-[6px] p-3 md:p-4 text-white shadow-none ${highlight ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} strokeWidth={2.5} />
        <div className="text-xs md:text-xs font-medium opacity-90">{label}</div>
      </div>
      <div className="text-2xl md:text-3xl font-semibold mt-1">{value}</div>
    </div>
  )
}
