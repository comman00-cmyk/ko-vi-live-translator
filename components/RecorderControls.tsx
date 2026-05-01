'use client'
import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

interface Props {
  onComplete: (blob: Blob, fileName: string) => void
}

export default function RecorderControls({ onComplete }: Props) {
  const [recording, setRecording] = useState(false)
  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mr.current = recorder
      chunks.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const fileName = `recording-${Date.now()}.webm`
        onComplete(blob, fileName)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(1000)
      setRecording(true)
    } catch {
      alert('마이크 접근 권한이 필요합니다.')
    }
  }

  const stop = () => {
    mr.current?.stop()
    setRecording(false)
  }

  if (recording) {
    return (
      <button
        onClick={stop}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
      >
        <Square className="w-4 h-4" />
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          녹음 중지
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={start}
      className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-medium transition-colors"
    >
      <Mic className="w-4 h-4" />
      녹음 시작
    </button>
  )
}
