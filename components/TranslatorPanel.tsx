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

// 대화 카드 — 원문(위) + 번역(아래) 수직 구조
function PairCard({ pair, isActive }: { pair: ConvPair; isActive: boolean }) {
  const srcText = pair.sourceLang === 'ko' ? pair.koText : pair.viText
  const trnText = pair.sourceLang === 'ko' ? pair.viText : pair.koText
  const srcFlag = pair.sourceLang === 'ko' ? '🇰🇷' : '🇻🇳'
  const trnFlag = pair.sourceLang === 'ko' ? '🇻🇳' : '🇰🇷'
  const srcLabel = pair.sourceLang === 'ko' ? '한국어 · 원문' : '베트남어 · 원문'
  const trnLabel = pair.sourceLang === 'ko' ? '베트남어 · 번역' : '한국어 · 번역'

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-200 ${
      isActive ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      {/* 원문 */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm leading-none">{srcFlag}</span>
          <span className="text-xs font-medium text-gray-400">{srcLabel}</span>
          {isActive && !srcText && (
            <span className="ml-auto text-xs text-gray-300 italic">인식 중...</span>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed min-h-[20px]">
          {srcText || (isActive ? <span className="text-gray-300 italic">음성 인식 중...</span> : '—')}
        </p>
      </div>

      {/* 번역 */}
      <div className={`border-t pt-3 ${isActive ? 'border-blue-100' : 'border-gray-100'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm leading-none">{trnFlag}</span>
          <span className="text-xs font-medium text-gray-400">{trnLabel}</span>
          {pair.translating && (
            <span className="flex items-center gap-1 text-xs text-blue-400 ml-auto font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> 번역 중
            </span>
          )}
        </div>
        <p className={`text-base font-semibold leading-relaxed min-h-[24px] ${
          isActive && trnText ? 'text-blue-900' : 'text-gray-800'
        }`}>
          {trnText ? (
            <>
              {trnText}
              {pair.translating && (
                <span className="inline-block w-[2px] h-5 bg-blue-500 animate-pulse ml-0.5 align-middle rounded-full" />
              )}
            </>
          ) : pair.translating ? (
            <span className="text-blue-300 font-normal text-sm">번역 중...</span>
          ) : (
            <span className="text-gray-200 font-normal text-sm">—</span>
          )}
        </p>
      </div>
    </div>
  )
}

// 가로 레이아웃용 언어별 독립 패널
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

  const Cursor = () => (
    <span className="inline-block w-[2px] h-[14px] bg-blue-500 animate-pulse ml-0.5 align-middle rounded-full" />
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-base leading-none">{flag}</span>
        <span className="text-sm font-semibold text-gray-700">{name}</span>
      </div>

      <div ref={ref} className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
        {pairs.length === 0 ? (
          <p className="text-xs text-gray-300 text-center pt-8">말씀하시면 여기에 표시됩니다</p>
        ) : pairs.map(pair => {
          const isActive   = pair.id === activePairId || pair.translating
          const isSource   = pair.sourceLang === lang
          const text       = lang === 'ko' ? pair.koText : pair.viText
          const streaming  = isActive && !isSource && pair.translating

          if (!text && !isActive) return null

          return (
            <div key={pair.id} className={`px-3 py-2.5 rounded-xl text-sm leading-relaxed transition-all duration-200 ${
              isActive
                ? isSource
                  ? 'bg-amber-50 border border-amber-100 text-gray-700'
                  : 'bg-blue-50 border border-blue-100'
                : 'text-gray-500'
            }`}>
              {text ? (
                <span className={isActive && !isSource ? 'text-blue-800 font-medium' : ''}>
                  {text}{streaming && <Cursor />}
                </span>
              ) : isActive ? (
                streaming
                  ? <span className="text-blue-400">번역 중...<Cursor /></span>
                  : <span className="text-gray-300 italic text-xs">인식 중...</span>
              ) : null}
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

  const pcRef          = useRef<RTCPeerConnection | null>(null)
  const dcRef          = useRef<RTCDataChannel | null>(null)
  const audioElRef     = useRef<HTMLAudioElement | null>(null)
  const startedAtRef   = useRef<Date>(new Date())
  const t0Ref          = useRef(0)
  const currentPairRef = useRef<string | null>(null)
  const statusRef      = useRef<Status>('disconnected')
  const voiceRef       = useRef(false)
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedRef        = useRef<HTMLDivElement>(null)

  const setStatusSafe = (s: Status) => { statusRef.current = s; setStatus(s) }

  // 새 pair 추가되거나 텍스트 업데이트 시 자동 스크롤
  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [pairs])

  useEffect(() => () => { destroyConnection() }, []) // eslint-disable-line

  const destroyConnection = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
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
      if (idx === -1) return [...prev, { id, koText: '', viText: '', sourceLang: 'ko', translating: false, ...patch }]
      const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next
    })
  }, [])

  const handleMsg = useCallback((e: MessageEvent) => {
    let msg: Record<string, unknown>
    try { msg = JSON.parse(e.data as string) } catch { return }
    const type = msg.type as string

    if (type === 'input_audio_buffer.speech_started') {
      t0Ref.current = Date.now()
      const id = makeId(); currentPairRef.current = id
      upsertPair(id, { translating: true }); return
    }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = (msg.transcript as string ?? '').trim(); if (!text) return
      const lang = detectLang(text)
      const id = currentPairRef.current ?? makeId(); currentPairRef.current = id
      upsertPair(id, { sourceLang: lang, koText: lang === 'ko' ? text : '', viText: lang === 'vi' ? text : '' }); return
    }
    if (type === 'response.text.delta') {
      const delta = (msg.delta as string) ?? ''; const id = currentPairRef.current
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
      const text = (msg.transcript as string ?? '').trim(); const id = currentPairRef.current
      if (!id || !text) return
      setPairs(prev => {
        const idx = prev.findIndex(p => p.id === id); if (idx === -1) return prev
        const p = prev[idx]
        if (p.sourceLang === 'ko' && !p.viText) { const n=[...prev]; n[idx]={...p, viText:text, translating:false}; return n }
        if (p.sourceLang === 'vi' && !p.koText) { const n=[...prev]; n[idx]={...p, koText:text, translating:false}; return n }
        return prev
      }); currentPairRef.current = null
    }
  }, [upsertPair])

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
          ? '연결 시간 초과 (20초). Safari에서는 STUN 후보 제한으로 연결이 실패할 수 있습니다. Chrome 또는 Firefox 사용을 권장합니다. (F12 → [WebRTC] 로그 참고)'
          : '연결 시간 초과 (20초). F12 콘솔의 [WebRTC] 로그를 확인해 주세요.')
      }
    }, 20000)

    try {
      // Safari AudioContext unlock — must happen inside user-gesture chain
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
        sendDC({ type: 'session.update', session: { modalities: voiceRef.current ? ['text','audio'] : ['text'], input_audio_transcription: { model: 'whisper-1' }, turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 200, silence_duration_ms: 700 } } })
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
  const reset = () => { setPairs([]); setLatencyMs(null); setErrorMsg(null); currentPairRef.current = null; onTranscriptChange?.('','') }
  const handleSave = () => {
    const ko = pairs.map(p => p.koText).filter(Boolean).join('\n')
    const vi = pairs.map(p => p.viText).filter(Boolean).join('\n')
    if (!ko && !vi) return
    onSessionSave?.({ direction: 'auto', originalText: ko, translatedText: vi, startedAt: startedAtRef.current, endedAt: new Date(), latencyMs: latencyMs ?? undefined })
  }

  const isActive   = status === 'connected' || status === 'connecting'
  const hasContent = pairs.length > 0
  const activePairId = currentPairRef.current

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 9rem)' }}>

      {/* ① 상태바 + 레이아웃 토글 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3">
        <div className="flex items-center gap-2.5">
          <StatusBadge status={status} />
          {latencyMs !== null && (
            <span className="text-xs text-gray-400 tabular-nums bg-gray-50 px-2 py-0.5 rounded-full">
              {latencyMs}ms
            </span>
          )}
        </div>
        {/* 레이아웃 토글 */}
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

      {/* ② 대화 피드 — 세로/가로 전환 */}
      {layout === 'horizontal' ? (
        /* 가로: 한국어 패널 | 베트남어 패널 */
        <div className="flex gap-3 flex-1 min-h-0">
          <LangPanel lang="ko" pairs={pairs} activePairId={activePairId} />
          <LangPanel lang="vi" pairs={pairs} activePairId={activePairId} />
        </div>
      ) : (
        /* 세로: 수직 카드 피드 */
        <div
          ref={feedRef}
          className="flex-1 overflow-y-auto space-y-3 pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
        >
          {pairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
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
            <>
              {pairs.map(pair => (
                <PairCard
                  key={pair.id}
                  pair={pair}
                  isActive={pair.id === activePairId || pair.translating}
                />
              ))}
              <div className="h-2" />
            </>
          )}
        </div>
      )}

      {/* ③ 컨트롤 — 항상 하단 고정, 버튼 4개 */}
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

        {/* 인라인 상태 메시지 */}
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
