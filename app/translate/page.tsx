'use client'
import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Lock, Type, Mic } from 'lucide-react'
import TranslatorPanel from '@/components/TranslatorPanel'
import TextTranslatorPanel from '@/components/TextTranslatorPanel'
import SummaryPanel from '@/components/SummaryPanel'

type Mode = 'text' | 'voice'

export default function TranslatePage() {
  const { data: session, status } = useSession()
  const [mode, setMode]           = useState<Mode>('text')
  const [original, setOriginal]   = useState('')
  const [translated, setTranslated] = useState('')
  const [summary, setSummary]     = useState('')
  const [savedId, setSavedId]     = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900 mb-1">로그인이 필요합니다</p>
          <p className="text-sm text-gray-500">통역을 시작하려면 Google 계정으로 로그인해 주세요.</p>
        </div>
        <button
          onClick={() => signIn('google')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Google로 로그인
        </button>
      </div>
    )
  }

  const handleTranscriptChange = (orig: string, trans: string) => {
    setOriginal(orig); setTranslated(trans)
  }

  const handleSessionSave = async (data: {
    direction: string; originalText: string; translatedText: string
    startedAt: Date; endedAt: Date; latencyMs?: number
  }) => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, summaryText: summary || undefined }),
      })
      if (!res.ok) throw new Error()
      const record = await res.json()
      setSavedId(record.id)
      alert('세션이 저장되었습니다.')
    } catch { alert('저장에 실패했습니다.') }
    finally  { setSaving(false) }
  }

  const handleRecordingComplete = async (blob: Blob, fileName: string) => {
    if (!savedId) { alert('세션을 먼저 저장해 주세요.'); return }
    const form = new FormData()
    form.append('file', blob, fileName); form.append('sessionId', savedId)
    try {
      const res = await fetch('/api/recordings/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error()
      alert('녹음 파일이 저장되었습니다.')
    } catch { alert('업로드에 실패했습니다.') }
  }
  void handleRecordingComplete // suppress unused warning — kept for future use

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* 페이지 헤더 + 탭 */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">실시간 통역</h1>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            텍스트
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'voice' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            음성
          </button>
        </div>
      </div>

      {/* 패널 */}
      {mode === 'text' ? (
        <TextTranslatorPanel onTranscriptChange={handleTranscriptChange} />
      ) : (
        <TranslatorPanel
          onTranscriptChange={handleTranscriptChange}
          onSessionSave={handleSessionSave}
        />
      )}

      {/* 요약 (내용 있을 때만) */}
      {(original || translated) && (
        <SummaryPanel
          originalText={original}
          translatedText={translated}
          summary={summary}
          onSummaryGenerated={setSummary}
        />
      )}

    </div>
  )
}
