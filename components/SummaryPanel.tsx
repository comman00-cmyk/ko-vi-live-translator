'use client'
import { useState } from 'react'
import { FileText, Copy } from 'lucide-react'
import TossCard from './TossCard'

interface Props {
  originalText: string
  translatedText: string
  summary: string
  onSummaryGenerated: (text: string) => void
}

export default function SummaryPanel({ originalText, translatedText, summary, onSummaryGenerated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!originalText.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original: originalText, translated: translatedText }),
      })
      if (!res.ok) throw new Error('요약 생성 실패')
      const data = await res.json()
      onSummaryGenerated(data.summary)
    } catch {
      setError('요약 생성에 실패했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => navigator.clipboard.writeText(summary)

  return (
    <TossCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">보고용 요약</h3>
        </div>
        <div className="flex gap-2">
          {summary && (
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              복사
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading || !originalText.trim()}
            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading ? '생성 중...' : '요약 생성'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {summary ? (
        <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{summary}</pre>
      ) : (
        <p className="text-sm text-gray-400">통역 후 위 버튼을 눌러 보고용 요약을 생성하세요.</p>
      )}
    </TossCard>
  )
}
