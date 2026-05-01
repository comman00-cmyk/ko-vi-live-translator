import Link from 'next/link'
import { Play, Database, ShieldCheck, Languages, FileText, Mic } from 'lucide-react'
import TossCard from '@/components/TossCard'

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-6">
          <Mic className="w-4 h-4" />
          OpenAI Realtime API 기반
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          한국어 ↔ 베트남어<br />실시간 통역
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          포멀한 비즈니스 통역 · 저지연 · 보고용 자동 요약
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TossCard className="text-center">
          <Languages className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">실시간 통역</h3>
          <p className="text-sm text-gray-500">WebRTC 기반 저지연 양방향 통역</p>
        </TossCard>
        <TossCard className="text-center">
          <Database className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">세션 저장</h3>
          <p className="text-sm text-gray-500">통역 내용과 녹음 파일을 클라우드에 저장</p>
        </TossCard>
        <TossCard className="text-center">
          <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">보고용 요약</h3>
          <p className="text-sm text-gray-500">경영진 보고용 자동 요약 7개 항목 생성</p>
        </TossCard>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/translate"
          className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-lg transition-colors shadow-sm"
        >
          <Play className="w-5 h-5" />
          실시간 통역 시작
        </Link>
        <Link
          href="/records"
          className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-semibold text-lg transition-colors"
        >
          <Database className="w-5 h-5" />
          기록 보기
        </Link>
        <Link
          href="/admin"
          className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-2xl font-semibold text-lg transition-colors"
        >
          <ShieldCheck className="w-5 h-5" />
          관리자
        </Link>
      </div>
    </div>
  )
}
