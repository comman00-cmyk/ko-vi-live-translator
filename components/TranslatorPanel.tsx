'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, RotateCcw, Save, Loader2, WifiOff,
  Volume2, VolumeX, Settings, Rows2, Columns2, AlignJustify, X,
} from 'lucide-react'
import StatusBadge from './StatusBadge'

// ─── Theme ────────────────────────────────────────────────────────────────────
type ThemeKey = 'white' | 'sky' | 'ivory' | 'sage' | 'navy' | 'midnight'
interface Theme { bg: string; text: string; accent: string; sub: string; divider: string }

const THEMES: Record<ThemeKey, Theme> = {
  white:    { bg: '#FFFFFF', text: '#111827', accent: '#2563EB', sub: '#9CA3AF', divider: '#E5E7EB' },
  sky:      { bg: '#EFF6FF', text: '#1E3A5F', accent: '#2563EB', sub: '#93C5FD', divider: '#BFDBFE' },
  ivory:    { bg: '#FFFBEB', text: '#1C1917', accent: '#D97706', sub: '#A8A29E', divider: '#FDE68A' },
  sage:     { bg: '#F0FDF4', text: '#14532D', accent: '#16A34A', sub: '#6EE7B7', divider: '#BBF7D0' },
  navy:     { bg: '#1E3A5F', text: '#E0F2FE', accent: '#60A5FA', sub: '#3D5A80', divider: '#2D5A8E' },
  midnight: { bg: '#0F172A', text: '#F1F5F9', accent: '#818CF8', sub: '#475569', divider: '#1E293B' },
}
const THEME_LABELS: Record<ThemeKey, string> = {
  white: '화이트', sky: '스카이', ivory: '아이보리',
  sage: '세이지', navy: '네이비', midnight: '미드나잇',
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Status   = 'disconnected' | 'connecting' | 'connected' | 'error'
type ViewMode = 'face' | 'landscape' | 'vertical'   // 대면 / 가로 / 세로

interface ConvPair {
  id: string; koText: string; viText: string
  sourceLang: 'ko' | 'vi'; translating: boolean; srcTyped: string
}
interface SessionSave {
  direction: string; originalText: string; translatedText: string
  startedAt: Date; endedAt: Date; latencyMs?: number
}
interface Props {
  onTranscriptChange?: (orig: string, trn: string) => void
  onSessionSave?: (data: SessionSave) => void
}

const REALTIME_MODEL = 'gpt-4o-realtime-preview'
const MIN_SPEECH_MS = 400
const MIN_TRANSCRIPT_LEN = 2

function detectLang(t: string): 'ko' | 'vi' { return /[가-힣ᄀ-ᇿ]/.test(t) ? 'ko' : 'vi' }
function makeId() { return Math.random().toString(36).slice(2, 10) }

function waitForIce(pc: RTCPeerConnection, ms = 7000): Promise<void> {
  return new Promise(r => {
    if (pc.iceGatheringState === 'complete') { r(); return }
    let done = false
    const finish = () => { if (!done) { done = true; clearInterval(poll); r() } }
    const t = setTimeout(finish, ms)
    const poll = setInterval(() => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); finish() } }, 150)
    const h = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t); clearInterval(poll)
        pc.removeEventListener('icegatheringstatechange', h); finish()
      }
    }
    pc.addEventListener('icegatheringstatechange', h)
  })
}

// ─── Cursor ───────────────────────────────────────────────────────────────────
function Cursor({ color = '#6b7280' }: { color?: string }) {
  return (
    <span className="inline-block w-[2px] rounded-full animate-pulse ml-0.5 align-text-bottom"
      style={{ height: '1em', backgroundColor: color, opacity: 0.8 }} />
  )
}

// ─── Mouth Icon ───────────────────────────────────────────────────────────────
// Animates open/close while speaking, stays closed when done
function MouthIcon({ speaking, color, size = 22 }: { speaking: boolean; color: string; size?: number }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!speaking) { setOpen(false); return }
    const t = setInterval(() => setOpen(v => !v), 260)
    return () => clearInterval(t)
  }, [speaking])

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ color, flexShrink: 0 }}>
      {/* upper lip */}
      <path d="M7 11 Q9.5 9 12 10 Q14.5 9 17 11"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* lower lip / jaw */}
      {open
        ? <path d="M7 11 Q9 17 12 17 Q15 17 17 11"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            fill="currentColor" fillOpacity="0.2" />
        : <path d="M7 11 Q12 14 17 11"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      }
    </svg>
  )
}

// ─── Theme Picker ─────────────────────────────────────────────────────────────
function ThemePicker({ koTheme, viTheme, onChange, onClose }: {
  koTheme: ThemeKey; viTheme: ThemeKey
  onChange: (lang: 'ko' | 'vi', key: ThemeKey) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800">패널 색상</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {(['ko', 'vi'] as const).map(lang => (
          <div key={lang} className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {lang === 'ko' ? '🇰🇷 한국어 패널' : '🇻🇳 베트남어 패널'}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {(Object.keys(THEMES) as ThemeKey[]).map(key => {
                const t = THEMES[key]
                const selected = (lang === 'ko' ? koTheme : viTheme) === key
                return (
                  <button key={key} onClick={() => onChange(lang, key)} title={THEME_LABELS[key]}
                    className={`flex flex-col items-center gap-1.5 transition-all ${selected ? '' : 'opacity-60 hover:opacity-90'}`}>
                    <div className={`w-9 h-9 rounded-xl border transition-all ${selected ? 'ring-2 ring-blue-500 ring-offset-1 scale-110' : 'border-gray-200'}`}
                      style={{ backgroundColor: t.bg }} />
                    <span className="text-[9px] text-gray-500">{THEME_LABELS[key]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <button onClick={onClose}
          className="w-full mt-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold">
          완료
        </button>
      </div>
    </div>
  )
}

// ─── Meeting Pane ─────────────────────────────────────────────────────────────
// Language-isolated display panel.
// hideOwnSpeech=true → only shows translations from the other side (for 대면 KO pane,
//   source speech goes to the dedicated KoSourceStrip instead)
function MeetingPane({ targetLang, pairs, theme, flipped = false, hideOwnSpeech = false }: {
  targetLang: 'ko' | 'vi'; pairs: ConvPair[]
  theme: Theme; flipped?: boolean; hideOwnSpeech?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Pairs to render in this zone
  const visible = pairs.filter(p => {
    const weSpoke = targetLang === 'ko' ? p.sourceLang === 'ko' : p.sourceLang === 'vi'
    if (weSpoke) return !hideOwnSpeech && p.srcTyped.length > 0
    const trnText = targetLang === 'ko' ? p.koText : p.viText
    return trnText.length > 0
  })

  // Listening state: active pair before any text is known (show in pane header)
  const isListening = pairs.some(p => p.translating && p.srcTyped.length === 0 && (targetLang === 'ko' ? p.koText.length === 0 : p.viText.length === 0))

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [visible])

  const emptyLabel = targetLang === 'ko'
    ? '베트남어로 말하거나 한국어로 말해보세요'
    : 'Nói tiếng Hàn hoặc tiếng Việt để bắt đầu'

  return (
    <div className="flex flex-col min-h-0" style={{
      flex: 1, backgroundColor: theme.bg,
      transform: flipped ? 'rotate(180deg)' : undefined,
    }}>
      {/* Zone header */}
      <div className="shrink-0 flex items-center gap-2 px-5 pt-3 pb-2"
        style={{ borderBottom: `1px solid ${theme.divider}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.sub }}>
          {targetLang === 'ko' ? '🇰🇷 한국어' : '🇻🇳 Tiếng Việt'}
        </span>
        {isListening && (
          <span className="ml-auto flex items-center gap-1.5" style={{ color: theme.accent }}>
            <MouthIcon speaking={true} color={theme.accent} size={16} />
            <span style={{ fontSize: 11 }}>인식 중...</span>
          </span>
        )}
      </div>

      {/* Conversation content */}
      <div ref={ref} className="flex-1 overflow-y-auto px-5 py-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${theme.sub}40 transparent` }}>
        {visible.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p style={{ color: theme.sub, fontSize: 13, opacity: 0.5, textAlign: 'center' }}>{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map(pair => {
              const weSpoke = targetLang === 'ko' ? pair.sourceLang === 'ko' : pair.sourceLang === 'vi'

              if (weSpoke) {
                // Our own speech — show source transcription
                const isActive = pair.translating
                return (
                  <div key={pair.id} className="flex items-start gap-3">
                    <div className="mt-1.5 shrink-0">
                      <MouthIcon speaking={isActive} color={isActive ? theme.accent : theme.sub} />
                    </div>
                    <p style={{
                      fontSize: 24, lineHeight: 1.45, wordBreak: 'break-word',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? theme.text : theme.text + 'AA',
                    }}>
                      {pair.srcTyped}
                      {isActive && <Cursor color={theme.accent} />}
                    </p>
                  </div>
                )
              } else {
                // Their speech — show translation into our language
                const trnText = targetLang === 'ko' ? pair.koText : pair.viText
                const streaming = pair.translating
                return (
                  <div key={pair.id} className="flex items-start gap-3">
                    <div className="mt-1.5 shrink-0">
                      <MouthIcon speaking={streaming} color={streaming ? theme.accent : theme.sub} />
                    </div>
                    <p style={{
                      fontSize: 24, lineHeight: 1.45, wordBreak: 'break-word',
                      fontWeight: streaming ? 500 : 400,
                      color: streaming ? theme.text : theme.text + 'AA',
                    }}>
                      {trnText}
                      {streaming && <Cursor color={theme.accent} />}
                    </p>
                  </div>
                )
              }
            })}
            <div className="h-2" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Korean Source Strip (대면 모드 하단 고정) ────────────────────────────────
// 한국인이 발화한 원문을 하단에 항상 표시. 발화 중에는 입 아이콘 애니메이션.
function KoSourceStrip({ pairs, theme }: { pairs: ConvPair[]; theme: Theme }) {
  const ref = useRef<HTMLDivElement>(null)

  // All completed Korean utterances + any active Korean pair
  const koSources = pairs.filter(p =>
    p.sourceLang === 'ko' && (p.srcTyped.length > 0 || p.translating)
  )

  // Scroll to latest on new entry
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [koSources.length])

  return (
    <div className="shrink-0 flex flex-col border-t"
      style={{ backgroundColor: theme.bg, borderColor: theme.divider, maxHeight: 120, minHeight: 52 }}>
      {/* Zone label */}
      <div className="px-4 pt-2 pb-1 shrink-0">
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.sub }}>
          🇰🇷 내 발화
        </span>
      </div>
      {/* Scrollable utterance history */}
      <div ref={ref} className="overflow-y-auto px-4 pb-3 space-y-1.5"
        style={{ scrollbarWidth: 'none' }}>
        {koSources.length === 0 ? (
          <p style={{ fontSize: 13, color: theme.sub, opacity: 0.4 }}>말하면 여기에 표시됩니다</p>
        ) : koSources.map(pair => {
          const isActive = pair.translating
          const text = pair.srcTyped
          return (
            <div key={pair.id} className="flex items-center gap-2.5">
              <MouthIcon
                speaking={isActive}
                color={isActive ? theme.accent : theme.sub}
                size={18}
              />
              <p style={{
                fontSize: 17, fontWeight: isActive ? 500 : 400, lineHeight: 1.35,
                color: isActive ? theme.text : theme.text + '88',
                flex: 1, wordBreak: 'break-word',
              }}>
                {text.length > 0
                  ? <>{text}{isActive && <Cursor color={theme.accent} />}</>
                  : isActive
                    ? <span style={{ fontSize: 13, opacity: 0.5 }}>인식 중<Cursor color={theme.accent} /></span>
                    : null
                }
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vertical Feed Entry (세로 모드) ──────────────────────────────────────────
function FeedEntry({ pair, isActive }: { pair: ConvPair; isActive: boolean }) {
  const src = pair.sourceLang
  const trn = src === 'ko' ? 'vi' : 'ko'
  const trnTxt = trn === 'ko' ? pair.koText : pair.viText
  const streaming = pair.translating && trnTxt.length > 0
  const pending   = pair.translating && trnTxt.length === 0 && pair.srcTyped.length > 0

  return (
    <div className={`flex gap-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      <div className="shrink-0 mt-0.5">
        <MouthIcon speaking={pair.translating} color={pair.translating ? '#3B82F6' : '#CBD5E1'} />
      </div>
      <div className="flex-1 min-w-0">
        {/* Source text */}
        <p className="text-sm leading-relaxed text-gray-700 break-words">
          <span className="mr-1.5">{src === 'ko' ? '🇰🇷' : '🇻🇳'}</span>
          {pair.srcTyped.length > 0
            ? pair.srcTyped
            : isActive
              ? <span className="text-gray-300 text-xs italic">인식 중<Cursor color="#d1d5db" /></span>
              : '—'
          }
        </p>
        {/* Translation */}
        {(trnTxt || pair.translating) && (
          <p className="text-sm font-medium leading-relaxed text-blue-700 break-words mt-1.5 ml-6">
            <span className="text-gray-300 text-xs mr-1">→</span>
            <span className="mr-1.5">{trn === 'ko' ? '🇰🇷' : '🇻🇳'}</span>
            {pending
              ? <span className="text-blue-300 text-xs font-normal">번역 중<Cursor color="#93c5fd" /></span>
              : <>{trnTxt}{streaming && <Cursor color="#3b82f6" />}</>
            }
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Side Panel (가로 모드 단일 언어 컬럼) ────────────────────────────────────
function SidePanel({ lang, pairs, activePairId }: {
  lang: 'ko' | 'vi'; pairs: ConvPair[]; activePairId: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [pairs])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-gray-100 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-base">{lang === 'ko' ? '🇰🇷' : '🇻🇳'}</span>
        <span className="text-sm font-semibold text-gray-700">{lang === 'ko' ? '한국어' : '베트남어'}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
        {pairs.length === 0 ? (
          <p className="text-xs text-gray-300 text-center pt-8">말씀하시면 여기에 표시됩니다</p>
        ) : pairs.map(pair => {
          const isActive  = pair.id === activePairId || pair.translating
          const isSource  = pair.sourceLang === lang
          const text      = isSource ? pair.srcTyped : (lang === 'ko' ? pair.koText : pair.viText)
          const streaming = !isSource && pair.translating && text.length > 0
          const pending   = !isSource && pair.translating && text.length === 0
          if (!text && !isActive) return null
          return (
            <div key={pair.id} className={`flex items-start gap-2 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              <div className="shrink-0 mt-0.5">
                {isSource
                  ? <MouthIcon speaking={pair.translating} color={pair.translating ? '#3B82F6' : '#CBD5E1'} />
                  : <div className="w-[22px]" />
                }
              </div>
              <p className="text-sm leading-relaxed break-words flex-1 min-w-0">
                {isSource && isActive && !text
                  ? <span className="text-gray-300 text-xs italic">인식 중<Cursor color="#d1d5db" /></span>
                  : pending
                    ? <span className="text-blue-300 text-xs italic">번역 중<Cursor color="#93c5fd" /></span>
                    : <span className={isSource
                        ? (isActive ? 'text-gray-800' : 'text-gray-500')
                        : (isActive ? 'text-blue-700 font-medium' : 'text-gray-500')}>
                        {text}{streaming && <Cursor color="#3b82f6" />}
                      </span>
                }
              </p>
            </div>
          )
        })}
        <div className="h-1" />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TranslatorPanel({ onTranscriptChange, onSessionSave }: Props) {
  const [status, setStatus]           = useState<Status>('disconnected')
  const [pairs, setPairs]             = useState<ConvPair[]>([])
  const [latencyMs, setLatencyMs]     = useState<number | null>(null)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [voiceOutput, setVoiceOutput] = useState(false)
  const [viewMode, setViewMode]       = useState<ViewMode>('face')
  const [koTheme, setKoTheme]         = useState<ThemeKey>('white')
  const [viTheme, setViTheme]         = useState<ThemeKey>('sky')
  const [showThemePicker, setShowThemePicker] = useState(false)

  const pcRef              = useRef<RTCPeerConnection | null>(null)
  const dcRef              = useRef<RTCDataChannel | null>(null)
  const audioElRef         = useRef<HTMLAudioElement | null>(null)
  const startedAtRef       = useRef<Date>(new Date())
  const t0Ref              = useRef(0)
  const currentPairRef     = useRef<string | null>(null)
  const statusRef          = useRef<Status>('disconnected')
  const voiceRef           = useRef(false)
  const timeoutRef         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedRef            = useRef<HTMLDivElement>(null)
  const speechStartedAtRef = useRef<number>(0)
  const speechDurationRef  = useRef<number>(0)
  const typingTimers       = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const itemToPairRef      = useRef<Record<string, string>>({})
  const wakeLockRef        = useRef<{ release: () => Promise<void> } | null>(null)

  // Persist themes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kovi-themes')
      if (saved) {
        const { ko, vi } = JSON.parse(saved) as { ko?: ThemeKey; vi?: ThemeKey }
        if (ko && THEMES[ko]) setKoTheme(ko)
        if (vi && THEMES[vi]) setViTheme(vi)
      }
    } catch { /* ignore */ }
  }, [])

  const saveTheme = (lang: 'ko' | 'vi', key: ThemeKey) => {
    const next = { ko: koTheme, vi: viTheme, [lang]: key }
    try { localStorage.setItem('kovi-themes', JSON.stringify(next)) } catch { /* ignore */ }
    if (lang === 'ko') setKoTheme(key); else setViTheme(key)
  }

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
    } catch { /* ignore */ }
  }
  const releaseWakeLock = () => { wakeLockRef.current?.release().catch(() => {}); wakeLockRef.current = null }
  const setStatusSafe = (s: Status) => { statusRef.current = s; setStatus(s) }

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [pairs])

  useEffect(() => () => { destroyConnection(); releaseWakeLock() }, []) // eslint-disable-line

  const destroyConnection = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    Object.values(typingTimers.current).forEach(clearInterval)
    typingTimers.current = {}; itemToPairRef.current = {}
    const dc = dcRef.current
    if (dc) { dc.onopen = dc.onclose = dc.onmessage = dc.onerror = null; dc.close(); dcRef.current = null }
    const pc = pcRef.current
    if (pc) {
      pc.ontrack = pc.onconnectionstatechange = pc.oniceconnectionstatechange =
        pc.onicecandidate = pc.onicegatheringstatechange = null
      pc.close(); pcRef.current = null
    }
    audioElRef.current?.remove(); audioElRef.current = null
    currentPairRef.current = null
  }

  const sendDC = (obj: unknown) => {
    try { dcRef.current?.readyState === 'open' && dcRef.current.send(JSON.stringify(obj)) } catch { /* ignore */ }
  }

  const upsertPair = useCallback((id: string, patch: Partial<ConvPair>) => {
    setPairs(prev => {
      const idx = prev.findIndex(p => p.id === id)
      if (idx === -1) return [...prev, { id, koText: '', viText: '', sourceLang: 'ko', translating: false, srcTyped: '', ...patch }]
      const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next
    })
  }, [])

  const animateSrc = useCallback((id: string, text: string) => {
    if (typingTimers.current[id]) clearInterval(typingTimers.current[id])
    let i = 0
    const speed = Math.max(12, Math.min(50, Math.floor(600 / text.length)))
    typingTimers.current[id] = setInterval(() => {
      i++
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === id)
        if (idx === -1) { clearInterval(typingTimers.current[id]); return prev }
        const next = [...prev]; next[idx] = { ...next[idx], srcTyped: text.slice(0, i) }; return next
      })
      if (i >= text.length) { clearInterval(typingTimers.current[id]); delete typingTimers.current[id] }
    }, speed)
  }, [])

  const discardPair = useCallback((pairId: string) => {
    if (typingTimers.current[pairId]) { clearInterval(typingTimers.current[pairId]); delete typingTimers.current[pairId] }
    setPairs(prev => prev.filter(p => p.id !== pairId))
    if (currentPairRef.current === pairId) currentPairRef.current = null
  }, [])

  const handleMsg = useCallback((e: MessageEvent) => {
    let msg: Record<string, unknown>
    try { msg = JSON.parse(e.data as string) } catch { return }
    const type = msg.type as string

    if (type === 'input_audio_buffer.speech_started') {
      speechStartedAtRef.current = Date.now()
      speechDurationRef.current = 0; t0Ref.current = Date.now()
      const oaiItemId = msg.item_id as string | undefined
      const pairId = makeId()
      currentPairRef.current = pairId
      if (oaiItemId) itemToPairRef.current[oaiItemId] = pairId
      upsertPair(pairId, { translating: true, srcTyped: '' }); return
    }

    if (type === 'input_audio_buffer.speech_stopped') {
      speechDurationRef.current = Date.now() - speechStartedAtRef.current; return
    }

    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = (msg.transcript as string ?? '').trim()
      const oaiItemId = msg.item_id as string | undefined
      const pairId = (oaiItemId && itemToPairRef.current[oaiItemId]) || currentPairRef.current
      if (oaiItemId) delete itemToPairRef.current[oaiItemId]

      if (!text || text.length < MIN_TRANSCRIPT_LEN) { if (pairId) discardPair(pairId); return }
      if (!pairId) return
      if (speechDurationRef.current > 0 && speechDurationRef.current < MIN_SPEECH_MS) {
        discardPair(pairId); speechDurationRef.current = 0; return
      }

      const lang = detectLang(text)
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === pairId)
        if (idx === -1) return prev
        const p = prev[idx]; const next = [...prev]
        if (lang === 'ko') {
          const trnText = p.sourceLang === 'vi' ? p.koText : p.viText
          next[idx] = { ...p, sourceLang: 'ko', koText: text, viText: trnText }
        } else {
          const trnText = p.sourceLang === 'ko' ? p.viText : p.koText
          next[idx] = { ...p, sourceLang: 'vi', viText: text, koText: trnText }
        }
        return next
      })
      animateSrc(pairId, text); return
    }

    if (type === 'response.text.delta') {
      const delta = (msg.delta as string) ?? ''
      const id = currentPairRef.current
      if (!id || !delta) return
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === id); if (idx === -1) return prev
        const p = prev[idx]; const next = [...prev]
        if (p.sourceLang === 'ko') {
          const provisional = p.viText + delta
          if (/[가-힣ᄀ-ᇿ]/.test(provisional)) {
            next[idx] = { ...p, sourceLang: 'vi', koText: provisional, viText: '' }
          } else {
            next[idx] = { ...p, viText: provisional }
          }
        } else {
          next[idx] = { ...p, koText: p.koText + delta }
        }
        return next
      }); return
    }

    if (type === 'response.text.done') {
      const id = currentPairRef.current
      if (id) {
        if (t0Ref.current) { setLatencyMs(Date.now() - t0Ref.current); t0Ref.current = 0 }
        upsertPair(id, { translating: false }); currentPairRef.current = null
      }; return
    }

    if (type === 'response.audio_transcript.done') {
      const text = (msg.transcript as string ?? '').trim()
      const id = currentPairRef.current
      if (!id || !text) return
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === id); if (idx === -1) return prev
        const p = prev[idx]
        if (p.sourceLang === 'ko' && !p.viText) { const n=[...prev]; n[idx]={...p,viText:text,translating:false}; return n }
        if (p.sourceLang === 'vi' && !p.koText) { const n=[...prev]; n[idx]={...p,koText:text,translating:false}; return n }
        return prev
      }); currentPairRef.current = null
    }
  }, [upsertPair, animateSrc, discardPair])

  useEffect(() => {
    const ko = pairs.map(p => p.koText).filter(Boolean).join('\n')
    const vi = pairs.map(p => p.viText).filter(Boolean).join('\n')
    onTranscriptChange?.(ko, vi)
  }, [pairs, onTranscriptChange])

  useEffect(() => { voiceRef.current = voiceOutput }, [voiceOutput])

  const toggleVoiceOutput = () => {
    const next = !voiceOutput; setVoiceOutput(next); voiceRef.current = next
    if (audioElRef.current) audioElRef.current.muted = !next
    if (statusRef.current === 'connected')
      sendDC({ type: 'session.update', session: { modalities: next ? ['text','audio'] : ['text'] } })
  }

  const connect = async () => {
    setStatusSafe('connecting'); setErrorMsg(null)
    const t0 = Date.now()
    const log = (m: string) => console.log(`[WebRTC ${Date.now()-t0}ms] ${m}`)

    timeoutRef.current = setTimeout(() => {
      if (statusRef.current !== 'connected') {
        const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
        destroyConnection(); setStatusSafe('error')
        setErrorMsg(isSafari
          ? '연결 시간 초과. Safari에서는 Chrome/Firefox 사용을 권장합니다.'
          : '연결 시간 초과 (20초). F12 콘솔을 확인해 주세요.')
      }
    }, 20000)

    try {
      try {
        type WA = { webkitAudioContext?: typeof AudioContext }
        const AC = window.AudioContext ?? (window as unknown as WA).webkitAudioContext
        if (AC) { const ctx = new AC(); await ctx.resume(); void ctx.close() }
      } catch { /* ignore */ }

      const tokenRes = await fetch('/api/realtime/session')
      if (!tokenRes.ok) {
        const b = await tokenRes.json().catch(()=>({})) as {error?:string}
        throw new Error(`토큰 실패 (${tokenRes.status})${b.error?': '+b.error:''}`)
      }
      const { client_secret } = await tokenRes.json() as { client_secret: { value: string } }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
        ],
      })
      pcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true; audioEl.muted = !voiceRef.current
      document.body.appendChild(audioEl); audioElRef.current = audioEl
      pc.ontrack = e => {
        audioEl.srcObject = e.streams[0] ?? new MediaStream([e.track])
        audioEl.play().catch(err => log(`autoplay: ${err}`))
      }

      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
      catch (err) {
        const name = (err as Error).name
        throw new Error(name === 'NotAllowedError' ? '마이크 권한이 거부됐습니다.' : `마이크 오류: ${name}`)
      }
      pc.addTrack(stream.getAudioTracks()[0], stream)

      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc
      dc.onopen = () => {
        log('connected ✓')
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
        setStatusSafe('connected'); startedAtRef.current = new Date()
        void requestWakeLock()
        sendDC({
          type: 'session.update',
          session: {
            modalities: voiceRef.current ? ['text','audio'] : ['text'],
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad', threshold: 0.65, prefix_padding_ms: 200, silence_duration_ms: 600 },
          },
        })
      }
      dc.onmessage = handleMsg
      dc.onclose = () => {
        if (statusRef.current === 'connected') setStatusSafe('disconnected')
        audioEl.remove(); audioElRef.current = null; releaseWakeLock()
      }
      dc.onerror = () => { setStatusSafe('error'); setErrorMsg('데이터 채널 오류'); destroyConnection() }

      pc.onconnectionstatechange = () => {
        log(`conn: ${pc.connectionState}`)
        if (pc.connectionState === 'failed') { destroyConnection(); setStatusSafe('error'); setErrorMsg('WebRTC 연결 실패.') }
        else if (pc.connectionState === 'disconnected' && statusRef.current === 'connected') setStatusSafe('disconnected')
      }
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') { destroyConnection(); setStatusSafe('error'); setErrorMsg('ICE 연결 실패.') }
      }
      pc.onicecandidate = e => { if (!e.candidate) log('ICE 수집 완료') }
      pc.onicegatheringstatechange = () => log(`ICE: ${pc.iceGatheringState}`)

      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      await waitForIce(pc)
      const sdp = pc.localDescription?.sdp ?? offer.sdp ?? ''
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${client_secret.value}`, 'Content-Type': 'application/sdp' },
        body: sdp,
      })
      if (!sdpRes.ok) throw new Error(`SDP 실패 (${sdpRes.status}): ${await sdpRes.text()}`)
      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() })
      log('SDP 완료 — dc.onopen 대기')

    } catch (err) {
      log(`오류: ${err instanceof Error ? err.message : String(err)}`)
      destroyConnection()
      if (statusRef.current !== 'error') setStatusSafe('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const disconnect = () => { destroyConnection(); setStatusSafe('disconnected'); setErrorMsg(null); releaseWakeLock() }
  const reset = () => {
    Object.values(typingTimers.current).forEach(clearInterval); typingTimers.current = {}
    setPairs([]); setLatencyMs(null); setErrorMsg(null); currentPairRef.current = null; onTranscriptChange?.('','')
  }
  const handleSave = () => {
    const ko = pairs.map(p => p.koText).filter(Boolean).join('\n')
    const vi = pairs.map(p => p.viText).filter(Boolean).join('\n')
    if (!ko && !vi) return
    onSessionSave?.({ direction: 'auto', originalText: ko, translatedText: vi, startedAt: startedAtRef.current, endedAt: new Date(), latencyMs: latencyMs ?? undefined })
  }

  const isActive    = status === 'connected' || status === 'connecting'
  const hasContent  = pairs.length > 0
  const activePairId = currentPairRef.current
  const koT = THEMES[koTheme]
  const viT = THEMES[viTheme]

  // Called as functions (not as <Components />) to avoid remount on every render
  const renderModeSwitcher = (dark: boolean) => (
    <div className="flex justify-center">
      <div className={`flex rounded-xl p-0.5 gap-0.5 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {([['face','대면',Rows2], ['landscape','가로',Columns2], ['vertical','세로',AlignJustify]] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === m
                ? dark ? 'bg-gray-700 text-white shadow' : 'bg-white text-blue-600 shadow-sm'
                : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>
    </div>
  )

  const renderCtrlBtns = (dark: boolean) => {
    const iconBtn = `flex items-center justify-center w-10 h-10 rounded-xl border transition-colors ${
      dark ? 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
    }`
    return (
      <div className="flex items-center gap-2 px-4">
        {!isActive
          ? <button onClick={connect} className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]">
              <Mic className="w-4 h-4" /> 통역 시작
            </button>
          : <button onClick={disconnect} className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${dark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
              <MicOff className="w-4 h-4" /> 중지
            </button>
        }
        <button onClick={() => setShowThemePicker(true)} className={iconBtn}><Settings className="w-4 h-4" /></button>
        <button onClick={toggleVoiceOutput} className={voiceOutput
          ? `flex items-center justify-center w-10 h-10 rounded-xl border transition-colors ${dark ? 'bg-purple-900 border-purple-700 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-600'}`
          : iconBtn}>
          {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button onClick={reset} className={iconBtn}><RotateCcw className="w-4 h-4" /></button>
        <button onClick={handleSave} disabled={!hasContent} className={`${iconBtn} disabled:opacity-30`}><Save className="w-4 h-4" /></button>
      </div>
    )
  }

  const statusMsg = (dark: boolean) => {
    const base = `text-xs flex items-center justify-center gap-1.5 px-4`
    if (status === 'connecting') return <p className={`${base} ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}><Loader2 className="w-3 h-3 animate-spin" />연결 중... 마이크 권한을 허용해 주세요.</p>
    if (status === 'error' && errorMsg) return <p className={`${base} ${dark ? 'text-red-400' : 'text-red-500'} text-center`}><WifiOff className="w-3 h-3 shrink-0" />{errorMsg}</p>
    if (latencyMs !== null && status === 'connected') return <p className={`${base} tabular-nums ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{latencyMs}ms</p>
    return null
  }

  // ── 대면 모드 (face-to-face portrait) ───────────────────────────────────────
  if (viewMode === 'face') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col">
        {showThemePicker && <ThemePicker koTheme={koTheme} viTheme={viTheme} onChange={saveTheme} onClose={() => setShowThemePicker(false)} />}

        {/* Vietnamese pane — rotated 180° for person across the table */}
        <MeetingPane targetLang="vi" pairs={pairs} theme={viT} flipped />

        {/* Center control strip */}
        <div className="shrink-0 bg-gray-50 border-y border-gray-200 py-2.5 space-y-2">
          {renderModeSwitcher(false)}
          {renderCtrlBtns(false)}
          {statusMsg(false)}
        </div>

        {/* Korean translation pane — VI→KO translations only */}
        <MeetingPane targetLang="ko" pairs={pairs} theme={koT} hideOwnSpeech />

        {/* Korean source strip — 한국인 발화 원문 (하단 고정) */}
        <KoSourceStrip pairs={pairs} theme={koT} />
      </div>
    )
  }

  // ── 가로 모드 (landscape side-by-side) ──────────────────────────────────────
  if (viewMode === 'landscape') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-white">
        {showThemePicker && <ThemePicker koTheme={koTheme} viTheme={viTheme} onChange={saveTheme} onClose={() => setShowThemePicker(false)} />}

        <div className="flex flex-1 min-h-0">
          <MeetingPane targetLang="ko" pairs={pairs} theme={koT} />
          <div className="w-px bg-gray-200 shrink-0" />
          <MeetingPane targetLang="vi" pairs={pairs} theme={viT} />
        </div>

        <div className="shrink-0 bg-gray-50 border-t border-gray-200 py-2.5 space-y-2">
          {renderModeSwitcher(false)}
          {renderCtrlBtns(false)}
          {statusMsg(false)}
        </div>
      </div>
    )
  }

  // ── 세로 모드 (vertical feed) ────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 9rem)' }}>
      {showThemePicker && <ThemePicker koTheme={koTheme} viTheme={viTheme} onChange={saveTheme} onClose={() => setShowThemePicker(false)} />}

      {/* Status bar + mode switcher */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3">
        <div className="flex items-center gap-2.5">
          <StatusBadge status={status} />
          {latencyMs !== null && <span className="text-xs text-gray-400 tabular-nums bg-gray-50 px-2 py-0.5 rounded-full">{latencyMs}ms</span>}
        </div>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {([['face','대면',Rows2], ['landscape','가로',Columns2], ['vertical','세로',AlignJustify]] as const).map(([m, label, Icon]) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef}
        className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
        {pairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status === 'connected' ? 'bg-blue-50' : 'bg-gray-50'}`}>
              {status === 'connecting'
                ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                : status === 'connected'
                  ? <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" /></span>
                  : <Mic className="w-6 h-6 text-gray-300" />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                {status === 'connected' ? '말씀하세요' : status === 'connecting' ? '연결 중...' : '통역 준비'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {status === 'connected'
                  ? '한국어 또는 베트남어로 말씀하시면 실시간 번역됩니다'
                  : '아래 버튼을 눌러 통역을 시작하세요'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pairs.map((pair, i) => (
              <div key={pair.id}>
                {i > 0 && <div className="border-t border-gray-100 mb-4" />}
                <FeedEntry pair={pair} isActive={pair.id === activePairId || pair.translating} />
              </div>
            ))}
            <div className="h-2" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2">
          {!isActive
            ? <button onClick={connect} className="flex items-center justify-center gap-2 flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]">
                <Mic className="w-4 h-4" />통역 시작
              </button>
            : <button onClick={disconnect} className="flex items-center justify-center gap-2 flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]">
                <MicOff className="w-4 h-4" />중지
              </button>
          }
          <button onClick={() => setShowThemePicker(true)} className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"><Settings className="w-4 h-4" /></button>
          <button onClick={toggleVoiceOutput} className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-colors ${voiceOutput ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
            {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={reset} className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={handleSave} disabled={!hasContent} className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"><Save className="w-4 h-4" /></button>
        </div>
        {status === 'connecting' && <p className="text-xs text-yellow-500 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />연결 중... 마이크 권한을 허용해 주세요.</p>}
        {status === 'connected' && <p className="text-xs text-blue-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />{voiceOutput ? '동시 통역 음성 출력 중' : '한국어 또는 베트남어로 말씀하세요'}</p>}
        {status === 'error' && errorMsg && <p className="text-xs text-red-400 flex items-center gap-1.5"><WifiOff className="w-3 h-3 shrink-0" />{errorMsg}</p>}
      </div>
    </div>
  )
}
