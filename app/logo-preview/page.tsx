import { LogoIconA, LogoIconB, LogoIconC, LogoWordmark } from '@/components/Logo'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">{title}</h2>
      {children}
    </section>
  )
}

function VariantCard({
  label,
  description,
  icon,
  wordmark,
}: {
  label: string
  description: string
  icon: React.ReactNode
  wordmark: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 p-6 flex flex-col items-center gap-6">
        <div className="flex items-end gap-4">
          {[24, 40, 64, 96].map(size => (
            <div key={size} className="flex flex-col items-center gap-2">
              <div style={{ width: size, height: size }}>{icon}</div>
              <span className="text-[10px] text-gray-400">{size}px</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-8">
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm">{wordmark}</div>
          <div className="bg-gray-900 rounded-xl px-5 py-3 shadow-sm">{wordmark}</div>
        </div>
      </div>
      <div className="bg-white px-6 py-4">
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black text-gray-900 mb-2">KO·VI 로고 미리보기</h1>
        <p className="text-gray-500 mb-12">세 가지 디자인을 비교하고 마음에 드는 것을 선택하세요.</p>

        <Section title="세 가지 디자인 비교">
          <div className="grid grid-cols-1 gap-6">
            <VariantCard
              label="A형 — 다크 네이비 (기본 권장)"
              description="딥 네이비 + 인디고 그라디언트 배경. 파란 글로우(한국어)와 오렌지 글로우(베트남어)로 양쪽 언어를 시각화. 속도를 표현하는 파란→보라→보라 쌍 꺾쇠."
              icon={<LogoIconA size={64} />}
              wordmark={<LogoWordmark variant="A" />}
            />
            <VariantCard
              label="B형 — 국기 컬러 대각 분할"
              description="한국(파랑 #003580)과 베트남(빨강 #CC0000)을 대각선으로 분할. 국가 정체성을 직관적으로 표현. 금색 V로 포인트."
              icon={<LogoIconB size={64} />}
              wordmark={<LogoWordmark variant="B" />}
            />
            <VariantCard
              label="C형 — 라이트 Toss 스타일"
              description="밝은 파랑-퍼플 그라디언트 배경에 파란 테두리. 라이트 모드에 자연스럽게 어울리는 토스 감성 디자인."
              icon={<LogoIconC size={64} />}
              wordmark={<LogoWordmark variant="C" />}
            />
          </div>
        </Section>

        <Section title="실제 사용 컨텍스트">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map(v => (
              <div key={v} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
                  <LogoWordmark variant={v} />
                  <span className="text-xs text-gray-400">네비게이션</span>
                </div>
                <div className="bg-white px-4 py-3 flex items-center justify-between">
                  <LogoWordmark variant={v} />
                  <span className="text-xs text-gray-400">라이트 배경</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="rounded-xl bg-blue-50 border border-blue-200 px-6 py-5">
          <p className="font-semibold text-blue-800 mb-1">적용 방법</p>
          <p className="text-sm text-blue-700">
            마음에 드는 디자인을 선택하면 <code className="bg-blue-100 px-1 rounded">app/layout.tsx</code>의 네비게이션 바에 바로 적용해 드릴게요.
            <br />
            <span className="font-medium">A형 (다크 네이비)</span>, <span className="font-medium">B형 (국기 분할)</span>, <span className="font-medium">C형 (라이트)</span> 중 선택해 주세요.
          </p>
        </div>
      </div>
    </div>
  )
}
