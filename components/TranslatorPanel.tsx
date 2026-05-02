'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { Mic, MicOff, RotateCcw, Save, Loader2, WifiOff, Volume2, VolumeX, Columns2, List } from 'lucide-react'
import StatusBadge from './StatusBadge'

type Status = 'disconnected' | 'connecting' | 'connected' | 'error'
type Layout = 'vertical' | 'horizontal'

interface ConvPair {
  id: string
  koText: string
  viText: string
  sourceLang: 'ko' | 'vi'
  translating: boolean
  srcTyped: string   // animated source text (typing effect)
}

interface SessionSave {
  direction: string
  originalText: string
  translatedText: string
  startedAt: Date
  endedAt: Date
  latencyMs?: number
}

interface Props {
  onTranscriptChange?: (original: string, translated: string) => void
  onSessionSave?: (data: SessionSave) => void
}

const REALTIME_MODEL = 'gpt-4o-realtime-preview'
const MIN_SPEECH_MS = 400    // 400ms 미만 발화는 노이즈로 간주
const MIN_TRANSCRIPT_LEN = 2 // 2자 미만 인식 결과 폐기

function detectLang(t: string): 'ko' | 'vi' { return /[가-힣ᄀ-ᇿ]/.test(t) ? 'ko' : 'vi' }
function makeId() { return Math.random().toString(36).slice(2, 10) }

function waitForIce(pc: RTCPeerConnection, ms = 7000): Promise<void> {
  return new Promise(r => {
    if (pc.iceGatheringState === 'complete') { r(); return }
    let done = false
    const finish = () => { if (!done) { done = true; clearInterval(poll); r() } }
    const t    = setTimeout(finish, ms)
    const poll = setInterval(() => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); finish() } }, 150)
    const h = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); clearInterval(poll); pc.removeEventListener('icegatheringstatechange', h); finish() } }
    pc.addEventListener('icegatheringstatechange', h)
  })
}

function Cursor({ color = '#6b7280' }: { color?: string }) {
  return (
    <span
      className="inline-block w-[2px] rounded-full animate-pulse ml-0.5 align-text-bottom"
      style={{ height: '1em', backgroundColor: color, opacity: 0.8 }}
    />
  )
}

// 세로 레이아웃 — 원문 + 번역을 한 블록으로
function VerticalEntry({ pair, isActive }: { pair: ConvPair; isActive: boolean }) {
  const srcLang = pair.sourceLang
  const trnLang = srcLang === 'ko' ? 'vi' : 'ko'
  const srcFlag = srcLang === 'ko' ? '🇰🇷' : '🇻🇳'
  const trnFlag = trnLang === 'ko' ? '🇰🇷' : '🇻🇳'
  const srcText = pair.srcTyped
  const trnText = trnLang === 'ko' ? pair.koText : pair.viText
  const trnStreaming = pair.translating && trnText.length > 0
  const trnPending   = pair.translating && trnText.length === 0 && srcText.length > 0

  return (
    <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      {/* 원문 줄 */}
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5 shrink-0 select-none">{srcFlag}</span>
        <p className={`text-sm leading-relaxed break-words ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
          {srcText || (isActive && !trnText ? (
            <span className="text-gray-300 text-xs italic">음성 인식 중<Cursor color="#d1d5db" /></span>
          ) : '—')}
          {/* 인식 완료됐지만 번역 아직 안 온 경우 커서 */}
          {isActive && srcText && !trnText && !pair.translating && (
            <Cursor color="#9ca3af" />
          )}
        </p>
      </div>

      {/* 번역 줄 */}
      {(trnText || pair.translating) && (
        <div className="flex items-start gap-1.5 mt-1.5 ml-6">
          <span className="text-xs text-gray-300 mt-0.5 shrink-0 select-none">→</span>
          <span className="text-sm leading-none mt-0.5 shrink-0 select-none">{trnFlag}</span>
          <p className={`text-sm font-medium leading-relaxed break-words ${isActive ? 'text-blue-700' : 'text-gray-500 font-normal'}`}>
            {trnPending ? (
              <span className="text-blue-300 text-xs font-normal">
                번역 중<Cursor color="#93c5fd" />
              </span>
            ) : (
              <>
                {trnText}
                {trnStreaming && <Cursor color="#3b82f6" />}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// 가로 레이아웃 — 언어별 패널 (타이핑 스트림)
function LangPanel({ lang, pairs, activePairId }: {
  lang: 'ko' | 'vi'
  pairs: ConvPair[]
  activePairId: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const flag = lang === 'ko' ? '🇰🇷' : '🇻🇳'
  const name = lang === 'ko' ? '한국어' : '베트남어'

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [pairs])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-base leading-none">{flag}</span>
        <span className="text-sm font-semibold text-gray-700">{name}</span>
      </div>

      <div
        ref={ref}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
      >
        {pairs.length === 0 ? (
          <p className="text-xs text-gray-300 text-center pt-8">말씀하시면 여기에 표시됩니다</p>
        ) : pairs.map(pair => {
          const isActive   = pair.id === activePairId || pair.translating
          const isSource   = pair.sourceLang === lang
          const text       = isSource ? pair.srcTyped : (lang === 'ko' ? pair.koText : pair.viText)
          const streaming  = !isSource && pair.translating && text.length > 0
          const pending    = !isSource && pair.translating && text.length === 0
          const srcActive  = isSource && isActive && !text

          if (!text && !isActive) return null

          return (
            <div key={pair.id} className={`text-sm leading-relaxed break-words transition-opacity ${isActive ? 'opacity-100' : 'opacity-55'}`}>
              {srcActive ? (
                <span className="text-xs text-gray-300 italic">
                  인식 중<Cursor color="#d1d5db" />
                </span>
              ) : pending ? (
                <span className="text-xs text-blue-300 italic">
                  번역 중<Cursor color="#93c5fd" />
                </span>
              ) : (
                <span className={isSource
                  ? (isActive ? 'text-gray-800' : 'text-gray-500')
                  : (isActive ? 'text-blue-700 font-medium' : 'text-gray-500')
                }>
                  {text}
                  {streaming && <Cursor color="#3b82f6" />}
                  {isSource && isActive && text && !pair.translating && <Cursor color="#9ca3af" />}
                </span>
              )}
            </div>
          )
        })}
        <div className="h-1" />
      </div>
    </div>
  )
}

export default function TranslatorPanel({ onTranscriptChange, onSessionSave }: Props) {
  const [status, setStatus]           = useState<Status>('disconnected')
  const [pairs, setPairs]             = useState<ConvPair[]>([])
  const [latencyMs, setLatencyMs]     = useState<number | null>(null)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [voiceOutput, setVoiceOutput] = useState(false)
  const [layout, setLayout]           = useState<Layout>('vertical')

  const pcRef             = useRef<RTCPeerConnection | null>(null)
  const dcRef             = useRef<RTCDataChannel | null>(null)
  const audioElRef        = useRef<HTMLAudioElement | null>(null)
  const startedAtRef      = useRef<Date>(new Date())
  const t0Ref             = useRef(0)
  const currentPairRef    = useRef<string | null>(null)
  const statusRef         = useRef<Status>('disconnected')
  const voiceRef          = useRef(false)
  const timeoutRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedRef           = useRef<HTMLDivElement>(null)
  const speechStartedAtRef = useRef<number>(0)
  const speechDurationRef  = useRef<number>(0)
  const typingTimers       = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const setStatusSafe = (s: Status) => { statusRef.current = s; setStatus(s) }

  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [pairs])

  useEffect(() => () => { destroyConnection() }, []) // eslint-disable-line

  const destroyConnection = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    Object.values(typingTimers.current).forEach(clearInterval)
    typingTimers.current = {}
    const dc = dcRef.current
    if (dc) { dc.onopen = dc.onclose = dc.onmessage = dc.onerror = null; dc.close(); dcRef.current = null }
    const pc = pcRef.current
    if (pc) { pc.ontrack = pc.onconnectionstatechange = pc.oniceconnectionstatechange = pc.onicecandidate = pc.onicegatheringstatechange = null; pc.close(); pcRef.current = null }
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

  // Source text typing animation — complete in ~600ms regardless of length
  const animateSrc = useCallback((id: string, text: string) => {
    if (typingTimers.current[id]) clearInterval(typingTimers.current[id])
    let i = 0
    const speed = Math.max(12, Math.min(50, Math.floor(600 / text.length)))
    typingTimers.current[id] = setInterval(() => {
      i++
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === id)
        if (idx === -1) { clearInterval(typingTimers.current[id]); return prev }
        const next = [...prev]
        next[idx] = { ...next[idx], srcTyped: text.slice(0, i) }
        return next
      })
      if (i >= text.length) { clearInterval(typingTimers.current[id]); delete typingTimers.current[id] }
    }, speed)
  }, [])

  const discardCurrentPair = useCallback(() => {
    const id = currentPairRef.current
    if (!id) return
    if (typingTimers.current[id]) { clearInterval(typingTimers.current[id]); delete typingTimers.current[id] }
    setPairs(prev => prev.filter(p => p.id !== id))
    currentPairRef.current = null
  }, [])

  const handleMsg = useCallback((e: MessageEvent) => {
    let msg: Record<string, unknown>
    try { msg = JSON.parse(e.data as string) } catch { return }
    const type = msg.type as string

    if (type === 'input_audio_buffer.speech_started') {
      speechStartedAtRef.current = Date.now()
      speechDurationRef.current = 0
      t0Ref.current = Date.now()
      const id = makeId(); currentPairRef.current = id
      upsertPair(id, { translating: true, srcTyped: '' }); return
    }

    if (type === 'input_audio_buffer.speech_stopped') {
      speechDurationRef.current = Date.now() - speechStartedAtRef.current
      return
    }

    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = (msg.transcript as string ?? '').trim()

      // ── 헛소리 필터 ──────────────────────────────────────────
      // 1) 빈 문자열 또는 너무 짧은 결과 폐기
      if (!text || text.length < MIN_TRANSCRIPT_LEN) { discardCurrentPair(); return }

      // 2) 대응하는 speech_started 없으면 폐기 (고아 페어 방지)
      if (!currentPairRef.current) return

      // 3) 400ms 미만 발화는 노이즈로 폐기
      if (speechDurationRef.current > 0 && speechDurationRef.current < MIN_SPEECH_MS) {
        discardCurrentPair(); speechDurationRef.current = 0; return
      }
      // ────────────────────────────────────────────────────────

      const id   = currentPairRef.current
      const lang = detectLang(text)
      upsertPair(id, { sourceLang: lang, koText: lang === 'ko' ? text : '', viText: lang === 'vi' ? text : '' })
      animateSrc(id, text)
      return
    }

    if (type === 'response.text.delta') {
      const delta = (msg.delta as string) ?? ''
      const id = currentPairRef.current
      if (!id || !delta) return
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === id); if (idx === -1) return prev
        const p = prev[idx]; const next = [...prev]
        next[idx] = p.sourceLang === 'ko' ? { ...p, viText: p.viText + delta } : { ...p, koText: p.koText + delta }
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
        if (p.sourceLang === 'ko' && !p.viText) { const n=[...prev]; n[idx]={...p, viText:text, translating:false}; return n }
        if (p.sourceLang === 'vi' && !p.koText) { const n=[...prev]; n[idx]={...p, koText:text, translating:false}; return n }
        return prev
      }); currentPairRef.current = null
    }
  }, [upsertPair, animateSrc, discardCurrentPair])

  useEffect(() => {
    const ko = pairs.map(p => p.koText).filter(Boolean).join('\n')
    const vi = pairs.map(p => p.viText).filter(Boolean).join('\n')
    onTranscriptChange?.(ko, vi)
  }, [pairs, onTranscriptChange])

  useEffect(() => { voiceRef.current = voiceOutput }, [voiceOutput])

  const toggleVoiceOutput = () => {
    const next = !voiceOutput; setVoiceOutput(next); voiceRef.current = next
    if (audioElRef.current) audioElRef.current.muted = !next
    if (statusRef.current === 'connected') sendDC({ type: 'session.update', session: { modalities: next ? ['text','audio'] : ['text'] } })
  }

  const connect = async () => {
    setStatusSafe('connecting'); setErrorMsg(null)
    const t0 = Date.now()
    const log = (m: string) => console.log(`[WebRTC ${Date.now()-t0}ms] ${m}`)

    timeoutRef.current = setTimeout(() => {
      if (statusRef.current !== 'connected') {
        log('TIMEOUT')
        const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
        destroyConnection(); setStatusSafe('error')
        setErrorMsg(isSafari
          ? '연결 시간 초과 (20초). Safari에서는 STUN 후보 제한으로 연결이 실패할 수 있습니다. Chrome 또는 Firefox 사용을 권장합니다.'
          : '연결 시간 초과 (20초). F12 콘솔의 [WebRTC] 로그를 확인해 주세요.')
      }
    }, 20000)

    try {
      try {
        type WA = { webkitAudioContext?: typeof AudioContext }
        const AC = window.AudioContext ?? (window as unknown as WA).webkitAudioContext
        if (AC) { const ctx = new AC(); await ctx.resume(); void ctx.close() }
      } catch { /* ignore */ }

      log('① 토큰')
      const tokenRes = await fetch('/api/realtime/session')
      if (!tokenRes.ok) { const b = await tokenRes.json().catch(()=>({})) as {error?:string}; throw new Error(`토큰 실패 (${tokenRes.status})${b.error?': '+b.error:''}`) }
      const { client_secret } = await tokenRes.json() as { client_secret: { value: string } }
      log('① OK')

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
        log('ontrack ✓')
        audioEl.srcObject = e.streams[0] ?? new MediaStream([e.track])
        audioEl.play().catch(err => log(`autoplay: ${err}`))
      }

      log('③ 마이크')
      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); log('③ OK') }
      catch (err) {
        const name = (err as Error).name; log(`③ 실패: ${name}`)
        throw new Error(name === 'NotAllowedError' ? '마이크 권한이 거부됐습니다.' : `마이크 오류: ${name}`)
      }
      pc.addTrack(stream.getAudioTracks()[0], stream)

      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc
      dc.onopen = () => {
        log('dc.onopen ✓')
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
        setStatusSafe('connected'); startedAtRef.current = new Date()
        sendDC({
          type: 'session.update',
          session: {
            modalities: voiceRef.current ? ['text','audio'] : ['text'],
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.7,           // 높일수록 더 명확한 발화만 인식
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
            },
          },
        })
      }
      dc.onmessage = handleMsg
      dc.onclose   = () => { log('dc.onclose'); if (statusRef.current === 'connected') setStatusSafe('disconnected'); audioEl.remove(); audioElRef.current = null }
      dc.onerror   = () => { setStatusSafe('error'); setErrorMsg('데이터 채널 오류'); destroyConnection() }

      pc.onconnectionstatechange = () => {
        log(`conn: ${pc.connectionState}`)
        if (pc.connectionState === 'failed') { destroyConnection(); setStatusSafe('error'); setErrorMsg('WebRTC 연결 실패.') }
        else if (pc.connectionState === 'disconnected' && statusRef.current === 'connected') setStatusSafe('disconnected')
      }
      pc.oniceconnectionstatechange = () => {
        log(`ICE: ${pc.iceConnectionState}`)
        if (pc.iceConnectionState === 'failed') { destroyConnection(); setStatusSafe('error'); setErrorMsg('ICE 연결 실패.') }
      }
      pc.onicecandidate = e => {
        if (e.candidate) log(`ICE 후보[${e.candidate.type}/${e.candidate.protocol}]: ${e.candidate.address ?? '?'}:${e.candidate.port ?? '?'}`)
        else log('ICE: 수집 완료 (null candidate)')
      }
      pc.onicegatheringstatechange = () => log(`ICE 수집상태: ${pc.iceGatheringState}`)

      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      log('⑥ ICE 수집 대기')
      await waitForIce(pc)
      const sdp = pc.localDescription?.sdp ?? offer.sdp ?? ''
      const allCandidates = sdp.match(/^a=candidate:.+$/gm) ?? []
      const hasPublic = allCandidates.some(c => /typ (srflx|relay)/.test(c))
      log(`⑥ ICE ${allCandidates.length}개 — srflx/relay: ${hasPublic}`)
      if (allCandidates.length > 0 && !hasPublic) log('⚠️ host 후보만 수집됨 — Safari ITP 가능성')

      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`, { method: 'POST', headers: { Authorization: `Bearer ${client_secret.value}`, 'Content-Type': 'application/sdp' }, body: sdp })
      if (!sdpRes.ok) throw new Error(`SDP 실패 (${sdpRes.status}): ${await sdpRes.text()}`)
      log('⑦ 답변 수신')
      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() })
      log('⑧ 완료 — dc.onopen 대기')

    } catch (err) {
      log(`오류: ${err instanceof Error ? err.message : String(err)}`)
      destroyConnection(); if (statusRef.current !== 'error') setStatusSafe('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const disconnect = () => { destroyConnection(); setStatusSafe('disconnected'); setErrorMsg(null) }
  const reset = () => {
    Object.values(typingTimers.current).forEach(clearInterval)
    typingTimers.current = {}
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

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 9rem)' }}>

      {/* 상태바 + 레이아웃 토글 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3">
        <div className="flex items-center gap-2.5">
          <StatusBadge status={status} />
          {latencyMs !== null && (
            <span className="text-xs text-gray-400 tabular-nums bg-gray-50 px-2 py-0.5 rounded-full">
              {latencyMs}ms
            </span>
          )}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setLayout('vertical')}
            title="세로 보기"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              layout === 'vertical' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List className="w-3.5 h-3.5" /> 세로
          </button>
          <button
            onClick={() => setLayout('horizontal')}
            title="가로 보기"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              layout === 'horizontal' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" /> 가로
          </button>
        </div>
      </div>

      {/* 대화 피드 */}
      {layout === 'horizontal' ? (
        <div className="flex gap-3 flex-1 min-h-0">
          <LangPanel lang="ko" pairs={pairs} activePairId={activePairId} />
          <LangPanel lang="vi" pairs={pairs} activePairId={activePairId} />
        </div>
      ) : (
        <div
          ref={feedRef}
          className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
        >
          {pairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                status === 'connected' ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                {status === 'connecting' ? (
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                ) : status === 'connected' ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                  </span>
                ) : (
                  <Mic className="w-6 h-6 text-gray-300" />
                )}
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
            <div className="space-y-0">
              {pairs.map((pair, i) => (
                <div key={pair.id}>
                  {i > 0 && <div className="border-t border-gray-100 my-3" />}
                  <VerticalEntry
                    pair={pair}
                    isActive={pair.id === activePairId || pair.translating}
                  />
                </div>
              ))}
              <div className="h-2" />
            </div>
          )}
        </div>
      )}

      {/* 컨트롤 바 */}
      <div className="shrink-0 mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button onClick={connect}
              className="flex items-center justify-center gap-2 flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-semibold text-sm transition-all">
              <Mic className="w-4 h-4" /> 통역 시작
            </button>
          ) : (
            <button onClick={disconnect}
              className="flex items-center justify-center gap-2 flex-1 py-3 bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white rounded-xl font-semibold text-sm transition-all">
              <MicOff className="w-4 h-4" /> 중지
            </button>
          )}

          <button onClick={toggleVoiceOutput}
            title={voiceOutput ? '동시 통역 음성 끄기' : '동시 통역 음성 켜기'}
            className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-colors ${
              voiceOutput ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}>
            {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button onClick={reset} title="초기화"
            className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>

          <button onClick={handleSave} disabled={!hasContent} title="세션 저장"
            className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Save className="w-4 h-4" />
          </button>
        </div>

        {status === 'connecting' && (
          <p className="mt-2.5 text-xs text-yellow-500 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> 연결 중... 마이크 권한을 허용해 주세요.
          </p>
        )}
        {status === 'connected' && (
          <p className="mt-2.5 text-xs text-blue-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            {voiceOutput ? '동시 통역 음성 출력 중' : '한국어 또는 베트남어로 말씀하세요'}
          </p>
        )}
        {status === 'error' && errorMsg && (
          <p className="mt-2.5 text-xs text-red-400 flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 shrink-0" /> {errorMsg}
          </p>
        )}
      </div>

    </div>
  )
}
