'use client'
import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { ShieldCheck, Lock, Trash2, Plus, Ban, CheckCircle } from 'lucide-react'
import AdminNav, { AdminTab } from '@/components/AdminNav'
import TossCard from '@/components/TossCard'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  sessionCount: number
  recordingCount: number
  totalUsers: number
  recentErrors: ErrorEntry[]
}

interface UserEntry {
  id: string; name: string | null; email: string; role: string
  blocked: boolean; blockedAt: string | null
  lastLoginAt: string | null; createdAt: string
  _count: { translationSessions: number }
}

interface GlossaryEntry {
  id: string; korean: string; vietnamese: string; english: string | null; description: string | null
}

interface SettingEntry { id: string; key: string; value: string }

interface ErrorEntry {
  id: string; message: string; stack: string | null; createdAt: string
  user?: { email: string } | null
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { fetch('/api/admin/stats').then(r => r.json()).then(setStats) }, [])

  if (!stats) return <div className="text-gray-400 text-sm">로딩 중...</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: '오늘 세션', value: stats.sessionCount },
          { label: '오늘 녹음', value: stats.recordingCount },
          { label: '전체 사용자', value: stats.totalUsers },
        ].map(({ label, value }) => (
          <TossCard key={label} className="text-center">
            <div className="text-3xl font-bold text-blue-600">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </TossCard>
        ))}
      </div>
      {stats.recentErrors.length > 0 && (
        <TossCard>
          <h3 className="font-semibold text-gray-900 mb-3">최근 에러</h3>
          <div className="space-y-2">
            {stats.recentErrors.map(e => (
              <div key={e.id} className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {e.message}
              </div>
            ))}
          </div>
        </TossCard>
      )}
    </div>
  )
}

// ─── Users ────────────────────────────────────────────────────────────────────

function Users() {
  const [users, setUsers] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { data: session } = useSession()

  useEffect(() => { fetch('/api/admin/users').then(r => r.json()).then(setUsers) }, [])

  const patch = async (id: string, body: object) => {
    setLoading(id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    const updated = await res.json()
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u))
    setLoading(null)
  }

  const deleteUser = async (id: string) => {
    setLoading(id)
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id))
    else { const e = await res.json(); alert(e.error) }
    setLoading(null); setConfirmDelete(null)
  }

  return (
    <div className="space-y-3">
      {/* 요약 배지 */}
      <div className="flex gap-3">
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm">
          <span className="text-gray-500">전체</span>
          <span className="ml-2 font-bold text-gray-900">{users.length}</span>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-sm">
          <span className="text-red-500">차단됨</span>
          <span className="ml-2 font-bold text-red-700">{users.filter(u => u.blocked).length}</span>
        </div>
      </div>

      <TossCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
                <th className="pb-3 pr-4 font-medium">사용자</th>
                <th className="pb-3 pr-4 font-medium">역할</th>
                <th className="pb-3 pr-4 font-medium">상태</th>
                <th className="pb-3 pr-4 font-medium">세션</th>
                <th className="pb-3 pr-4 font-medium">마지막 로그인</th>
                <th className="pb-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const isSelf = u.email === session?.user?.email
                const busy   = loading === u.id
                return (
                  <tr key={u.id} className={`transition-colors ${u.blocked ? 'bg-red-50/40' : ''}`}>
                    {/* 사용자 */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          u.blocked ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {(u.name ?? u.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 leading-tight">{u.name ?? '-'}</div>
                          <div className="text-xs text-gray-400 leading-tight">{u.email}</div>
                        </div>
                        {isSelf && <span className="text-xs text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">나</span>}
                      </div>
                    </td>

                    {/* 역할 */}
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        disabled={isSelf || busy}
                        onChange={e => patch(u.id, { role: e.target.value })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>

                    {/* 상태 */}
                    <td className="py-3 pr-4">
                      {u.blocked ? (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full w-fit">
                          <Ban className="w-3 h-3" /> 차단됨
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full w-fit">
                          <CheckCircle className="w-3 h-3" /> 정상
                        </span>
                      )}
                    </td>

                    {/* 세션수 */}
                    <td className="py-3 pr-4 text-gray-600 tabular-nums">{u._count.translationSessions}</td>

                    {/* 마지막 로그인 */}
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '-'}
                    </td>

                    {/* 관리 버튼 */}
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {!isSelf && (
                          <>
                            {u.blocked ? (
                              <button
                                onClick={() => patch(u.id, { action: 'unblock' })}
                                disabled={busy}
                                title="차단 해제"
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg disabled:opacity-40 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> 해제
                              </button>
                            ) : (
                              <button
                                onClick={() => patch(u.id, { action: 'block' })}
                                disabled={busy}
                                title="차단"
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg disabled:opacity-40 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" /> 차단
                              </button>
                            )}
                            {confirmDelete === u.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  disabled={busy}
                                  className="px-2 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 transition-colors"
                                >확인</button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                >취소</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(u.id)}
                                title="삭제"
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        {busy && <span className="text-xs text-gray-300 animate-pulse ml-1">처리 중...</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">사용자가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </TossCard>
    </div>
  )
}

// ─── Glossary ─────────────────────────────────────────────────────────────────

function Glossary() {
  const [items, setItems] = useState<GlossaryEntry[]>([])
  const [form, setForm] = useState({ korean: '', vietnamese: '', english: '', description: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetch('/api/admin/glossary').then(r => r.json()).then(setItems) }, [])

  const add = async () => {
    if (!form.korean || !form.vietnamese) return
    setAdding(true)
    const res = await fetch('/api/admin/glossary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const item = await res.json()
    setItems(prev => [item, ...prev])
    setForm({ korean: '', vietnamese: '', english: '', description: '' })
    setAdding(false)
  }

  const del = async (id: string) => {
    await fetch('/api/admin/glossary', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-4">
      <TossCard>
        <h3 className="font-semibold mb-3">용어 추가</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {(['korean', 'vietnamese', 'english', 'description'] as const).map(k => (
            <input
              key={k}
              value={form[k]}
              onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))}
              placeholder={{ korean: '한국어 *', vietnamese: '베트남어 *', english: '영어', description: '설명' }[k]}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>
        <button
          onClick={add}
          disabled={adding || !form.korean || !form.vietnamese}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </TossCard>

      <TossCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 pr-4">한국어</th>
                <th className="pb-3 pr-4">베트남어</th>
                <th className="pb-3 pr-4">영어</th>
                <th className="pb-3 pr-4">설명</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4 font-medium">{item.korean}</td>
                  <td className="py-3 pr-4">{item.vietnamese}</td>
                  <td className="py-3 pr-4 text-gray-500">{item.english ?? '-'}</td>
                  <td className="py-3 pr-4 text-gray-500">{item.description ?? '-'}</td>
                  <td className="py-3">
                    <button onClick={() => del(item.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">등록된 용어가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </TossCard>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings() {
  const [settings, setSettings] = useState<SettingEntry[]>([])
  const [key, setKey]   = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch('/api/admin/settings').then(r => r.json()).then(setSettings) }, [])

  const save = async () => {
    if (!key) return
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    const item = await res.json()
    setSettings(prev => {
      const exists = prev.findIndex(s => s.key === item.key)
      return exists >= 0 ? prev.map((s, i) => i === exists ? item : s) : [item, ...prev]
    })
    setKey(''); setValue('')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <TossCard>
        <h3 className="font-semibold mb-3">설정 추가/수정</h3>
        <div className="flex gap-3">
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="키" className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="값" className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={save} disabled={saving || !key} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-medium transition-colors">저장</button>
        </div>
      </TossCard>
      <TossCard>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 pr-4">키</th>
              <th className="pb-3">값</th>
            </tr>
          </thead>
          <tbody>
            {settings.map(s => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-3 pr-4 font-medium font-mono text-xs">{s.key}</td>
                <td className="py-3 text-gray-600">{s.value}</td>
              </tr>
            ))}
            {settings.length === 0 && (
              <tr><td colSpan={2} className="py-6 text-center text-gray-400">설정이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </TossCard>
    </div>
  )
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

function Logs() {
  const [logs, setLogs] = useState<ErrorEntry[]>([])
  useEffect(() => { fetch('/api/admin/logs').then(r => r.json()).then(setLogs) }, [])

  return (
    <TossCard>
      {logs.length === 0 ? (
        <p className="text-center text-gray-400 py-6">에러 로그가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                {log.user && <span className="text-xs text-gray-500">{log.user.email}</span>}
              </div>
              <p className="text-sm text-red-700">{log.message}</p>
              {log.stack && (
                <pre className="text-xs text-gray-500 mt-2 overflow-x-auto whitespace-pre-wrap">{log.stack}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </TossCard>
  )
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<AdminTab>('dashboard')

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim())

  if (status === 'loading') {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6">관리자 페이지에 접근하려면 로그인이 필요합니다.</p>
        <button onClick={() => signIn('google')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">
          Google 로그인
        </button>
      </div>
    )
  }

  // Client-side check (server-side is enforced in API routes)
  if (!adminEmails.includes(session.user?.email ?? '')) {
    return (
      <div className="text-center py-20">
        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">관리자 권한이 없습니다.</p>
      </div>
    )
  }

  const tabContent: Record<AdminTab, React.ReactNode> = {
    dashboard: <Dashboard />,
    users:     <Users />,
    glossary:  <Glossary />,
    records:   <RecordsTab />,
    settings:  <Settings />,
    logs:      <Logs />,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">관리자</h1>
      </div>
      <AdminNav active={tab} onChange={setTab} />
      {tabContent[tab]}
    </div>
  )
}

// ─── Records Tab (admin view all) ─────────────────────────────────────────────

function RecordsTab() {
  const [records, setRecords] = useState<Array<{
    id: string; direction: string; originalText: string; createdAt: string
    user?: { email: string }
  }>>([])

  useEffect(() => {
    fetch('/api/admin/records').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRecords(data)
    })
  }, [])

  return (
    <TossCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 pr-4">방향</th>
              <th className="pb-3 pr-4">원문 (미리보기)</th>
              <th className="pb-3 pr-4">사용자</th>
              <th className="pb-3">날짜</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-3 pr-4">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{r.direction}</span>
                </td>
                <td className="py-3 pr-4 text-gray-700 max-w-xs truncate">{r.originalText}</td>
                <td className="py-3 pr-4 text-gray-500 text-xs">{r.user?.email ?? '-'}</td>
                <td className="py-3 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-400">기록이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </TossCard>
  )
}
