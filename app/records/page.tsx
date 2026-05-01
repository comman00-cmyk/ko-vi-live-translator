'use client'
import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Copy, Play, Trash2, Lock, Database } from 'lucide-react'
import TossCard from '@/components/TossCard'

interface Recording {
  id: string
  fileUrl: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

interface Session {
  id: string
  direction: string
  originalText: string
  translatedText: string
  summaryText: string | null
  startedAt: string
  endedAt: string | null
  latencyMs: number | null
  createdAt: string
  recordings: Recording[]
}

const DIR_LABEL: Record<string, string> = {
  'ko-vi': '한→베',
  'vi-ko': '베→한',
  'auto':  '자동',
}

function copy(text: string) {
  navigator.clipboard.writeText(text)
}

export default function RecordsPage() {
  const { data: authSession, status } = useSession()
  const [records, setRecords]   = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/records')
        .then(r => r.json())
        .then(data => { setRecords(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [status])

  const deleteRecord = async (id: string) => {
    if (!confirm('이 통역 기록을 삭제하시겠습니까?')) return
    await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  if (status === 'loading') {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>
  }

  if (!authSession) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6">기록을 보려면 로그인이 필요합니다.</p>
        <button
          onClick={() => signIn('google')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
        >
          Google 로그인
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">통역 기록</h1>
        <span className="ml-auto text-sm text-gray-400">{records.length}개</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : records.length === 0 ? (
        <TossCard className="text-center py-12">
          <p className="text-gray-400">저장된 통역 기록이 없습니다.</p>
        </TossCard>
      ) : (
        <div className="space-y-4">
          {records.map(rec => (
            <TossCard key={rec.id}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                      {DIR_LABEL[rec.direction] ?? rec.direction}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(rec.createdAt).toLocaleString('ko-KR')}
                    </span>
                    {rec.latencyMs && (
                      <span className="text-xs text-gray-400">{rec.latencyMs}ms</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{rec.originalText}</p>
                </div>
                <button
                  onClick={() => deleteRecord(rec.id)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded */}
              {expanded === rec.id && (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                  {/* Original */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">원문</h4>
                      <button onClick={() => copy(rec.originalText)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                        <Copy className="w-3 h-3" />복사
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{rec.originalText}</p>
                  </div>

                  {/* Translation */}
                  {rec.translatedText && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">번역</h4>
                        <button onClick={() => copy(rec.translatedText)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                          <Copy className="w-3 h-3" />복사
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{rec.translatedText}</p>
                    </div>
                  )}

                  {/* Summary */}
                  {rec.summaryText && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">보고용 요약</h4>
                        <button onClick={() => copy(rec.summaryText!)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                          <Copy className="w-3 h-3" />복사
                        </button>
                      </div>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{rec.summaryText}</pre>
                    </div>
                  )}

                  {/* Recordings */}
                  {rec.recordings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">녹음 파일</h4>
                      <div className="space-y-2">
                        {rec.recordings.map(r => (
                          <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <audio controls src={r.fileUrl} className="flex-1 h-8 min-w-0" />
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {(r.sizeBytes / 1024).toFixed(0)}KB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TossCard>
          ))}
        </div>
      )}
    </div>
  )
}
