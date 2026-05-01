'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Loader2, RotateCcw, Copy, ArrowLeftRight } from 'lucide-react'

interface Props {
  onTranscriptChange?: (original: string, translated: string) => void
}

type ActiveSide = 'ko' | 'vi'

export default function TextTranslatorPanel({ onTranscriptChange }: Props) {
  const [koText, setKoText]   = useState('')
  const [viText, setViText]   = useState('')
  const [loading, setLoading] = useState<ActiveSide | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const activeSide    = useRef<ActiveSide | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const translate = useCallback(async (text: string, from: ActiveSide) => {
    if (!text.trim()) {
      if (from === 'ko') { setViText(''); onTranscriptChange?.(text, '') }
      else               { setKoText(''); onTranscriptChange?.('', text) }
      return
    }
    setLoading(from); setError(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, direction: from === 'ko' ? 'ko-vi' : 'vi-ko' }),
      })
      if (!res.ok) throw new Error()
      const { translation } = await res.json() as { translation: string }
      if (activeSide.current === from) {
        if (from === 'ko') { setViText(translation); onTranscriptChange?.(text, translation) }
        else               { setKoText(translation); onTranscriptChange?.(translation, text) }
      }
    } catch { setError('번역 중 오류가 발생했습니다.') }
    finally  { setLoading(null) }
  }, [onTranscriptChange])

  const schedule = (text: string, side: ActiveSide) => {
    activeSide.current = side
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => translate(text, side), 600)
  }

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }, [])

  const reset = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    activeSide.current = null; setKoText(''); setViText(''); setError(null)
    onTranscriptChange?.('', '')
  }

  return (
    <div className="space-y-3">

      {/* 안내 + 초기화 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>한쪽에 입력하면 0.6초 후 자동 번역</span>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> 초기화
        </button>
      </div>

      {/* 한국어 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🇰🇷</span>
            <span className="text-sm font-semibold text-gray-700">한국어</span>
            {loading === 'ko' && (
              <span className="flex items-center gap-1 text-xs text-blue-500 ml-1">
                <Loader2 className="w-3 h-3 animate-spin" /> 번역 중
              </span>
            )}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(koText)}
            disabled={!koText}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <Copy className="w-3 h-3" /> 복사
          </button>
        </div>
        <textarea
          value={koText}
          onChange={e => { setKoText(e.target.value); schedule(e.target.value, 'ko') }}
          onFocus={() => { activeSide.current = 'ko' }}
          placeholder="한국어로 입력하세요..."
          rows={5}
          className="w-full text-sm text-gray-900 placeholder-gray-300 bg-transparent resize-none focus:outline-none leading-relaxed"
        />
      </div>

      {/* 베트남어 카드 — 번역 텍스트 더 크게 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🇻🇳</span>
            <span className="text-sm font-semibold text-gray-700">베트남어</span>
            {loading === 'vi' && (
              <span className="flex items-center gap-1 text-xs text-green-500 ml-1">
                <Loader2 className="w-3 h-3 animate-spin" /> 번역 중
              </span>
            )}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(viText)}
            disabled={!viText}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <Copy className="w-3 h-3" /> 복사
          </button>
        </div>
        <textarea
          value={viText}
          onChange={e => { setViText(e.target.value); schedule(e.target.value, 'vi') }}
          onFocus={() => { activeSide.current = 'vi' }}
          placeholder="Nhập tiếng Việt..."
          rows={5}
          className="w-full text-sm text-gray-900 placeholder-gray-300 bg-transparent resize-none focus:outline-none leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  )
}
