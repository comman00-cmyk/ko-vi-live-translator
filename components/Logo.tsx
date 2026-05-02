'use client'

// ─── KO-VI 로고 시스템 ─────────────────────────────────────────────────────────

// A형: 다크 네이비 + 속도감 (기본 권장)
export function LogoIconA({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="a-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A"/>
          <stop offset="1" stopColor="#1E1B4B"/>
        </linearGradient>
        <linearGradient id="a-ray" x1="18" y1="32" x2="46" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8"/>
          <stop offset="0.5" stopColor="#818CF8"/>
          <stop offset="1" stopColor="#C084FC"/>
        </linearGradient>
        <radialGradient id="a-glow-ko" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="a-glow-vi" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#F97316" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* 배경 */}
      <rect width="64" height="64" rx="15" fill="url(#a-bg)"/>

      {/* 한국어 글로우 */}
      <ellipse cx="15" cy="32" rx="14" ry="14" fill="url(#a-glow-ko)"/>

      {/* 베트남어 글로우 */}
      <ellipse cx="49" cy="32" rx="14" ry="14" fill="url(#a-glow-vi)"/>

      {/* 속도선 — 왼쪽 */}
      <line x1="2" y1="26" x2="7" y2="26" stroke="#93C5FD" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="30" x2="7" y2="30" stroke="#93C5FD" strokeOpacity="0.75" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="1" y1="34" x2="7" y2="34" stroke="#93C5FD" strokeOpacity="0.75" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="2" y1="38" x2="7" y2="38" stroke="#93C5FD" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>

      {/* 한 */}
      <text x="7" y="41"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif"
        fontSize="22" fontWeight="900" fill="white">한</text>

      {/* 중앙 쌍 꺾쇠 (속도 ≫) */}
      <path d="M25 24 L31.5 32 L25 40"
        stroke="url(#a-ray)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M31 24 L37.5 32 L31 40"
        stroke="url(#a-ray)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        strokeOpacity="0.45"/>

      {/* V */}
      <text x="38" y="41"
        fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontSize="23" fontWeight="900" fontStyle="italic" fill="#FB923C">V</text>

      {/* 속도선 — 오른쪽 */}
      <line x1="57" y1="26" x2="62" y2="26" stroke="#FDBA74" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="57" y1="30" x2="63" y2="30" stroke="#FDBA74" strokeOpacity="0.75" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="57" y1="34" x2="63" y2="34" stroke="#FDBA74" strokeOpacity="0.75" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="57" y1="38" x2="62" y2="38" stroke="#FDBA74" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// B형: 국기 컬러 대각 분할
export function LogoIconB({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <clipPath id="b-left">
          <polygon points="0,0 40,0 24,64 0,64"/>
        </clipPath>
        <clipPath id="b-right">
          <polygon points="40,0 64,0 64,64 24,64"/>
        </clipPath>
        <linearGradient id="b-chevron" x1="22" y1="32" x2="42" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.9"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.4"/>
        </linearGradient>
      </defs>

      {/* 전체 배경 */}
      <rect width="64" height="64" rx="15" fill="#111827"/>

      {/* 한국 파랑 반쪽 */}
      <rect width="64" height="64" rx="15" fill="#003580" clipPath="url(#b-left)"/>

      {/* 베트남 빨강 반쪽 */}
      <rect width="64" height="64" rx="15" fill="#CC0000" clipPath="url(#b-right)"/>

      {/* 대각 빛 줄기 */}
      <line x1="32" y1="0" x2="32" y2="64" stroke="white" strokeOpacity="0.08" strokeWidth="28"/>

      {/* 속도선 — 왼쪽 */}
      <line x1="2" y1="29" x2="8" y2="29" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="33" x2="8" y2="33" stroke="white" strokeOpacity="0.7" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="2" y1="37" x2="8" y2="37" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>

      {/* 한 */}
      <text x="7" y="41"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        fontSize="22" fontWeight="900" fill="white">한</text>

      {/* 쌍 꺾쇠 */}
      <path d="M24 24 L30.5 32 L24 40"
        stroke="url(#b-chevron)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 24 L36.5 32 L30 40"
        stroke="url(#b-chevron)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        strokeOpacity="0.45"/>

      {/* V */}
      <text x="38" y="41"
        fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontSize="23" fontWeight="900" fontStyle="italic" fill="#FFD700">V</text>

      {/* 속도선 — 오른쪽 */}
      <line x1="56" y1="29" x2="62" y2="29" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="56" y1="33" x2="63" y2="33" stroke="white" strokeOpacity="0.7" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="56" y1="37" x2="62" y2="37" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// C형: 화이트 Toss 스타일 (라이트 모드 친화)
export function LogoIconC({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="c-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EFF6FF"/>
          <stop offset="1" stopColor="#F5F3FF"/>
        </linearGradient>
        <linearGradient id="c-ray" x1="20" y1="32" x2="44" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB"/>
          <stop offset="1" stopColor="#7C3AED"/>
        </linearGradient>
      </defs>

      {/* 배경 */}
      <rect width="64" height="64" rx="15" fill="url(#c-bg)"/>
      <rect width="64" height="64" rx="15" stroke="#E0E7FF" strokeWidth="1.5"/>

      {/* 속도선 — 왼쪽 */}
      <line x1="2" y1="29" x2="7" y2="29" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="33" x2="7" y2="33" stroke="#3B82F6" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="2" y1="37" x2="7" y2="37" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>

      {/* 한 */}
      <text x="7" y="41"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        fontSize="22" fontWeight="900" fill="#1E40AF">한</text>

      {/* 쌍 꺾쇠 */}
      <path d="M25 24 L31.5 32 L25 40"
        stroke="url(#c-ray)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M31 24 L37.5 32 L31 40"
        stroke="url(#c-ray)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        strokeOpacity="0.4"/>

      {/* V */}
      <text x="38" y="41"
        fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontSize="23" fontWeight="900" fontStyle="italic" fill="#EA580C">V</text>

      {/* 속도선 — 오른쪽 */}
      <line x1="57" y1="29" x2="62" y2="29" stroke="#FDBA74" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="57" y1="33" x2="63" y2="33" stroke="#F97316" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="57" y1="37" x2="62" y2="37" stroke="#FDBA74" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// 워드마크 (아이콘 + 텍스트)
export function LogoWordmark({
  variant = 'A',
  className,
}: {
  variant?: 'A' | 'B' | 'C'
  className?: string
}) {
  const Icon = variant === 'A' ? LogoIconA : variant === 'B' ? LogoIconB : LogoIconC
  const textColor = variant === 'C' ? 'text-gray-900' : 'text-gray-900'
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <Icon size={40}/>
      <div className="leading-none">
        <div className={`font-black text-[17px] tracking-tight ${textColor}`}>
          KO<span className="text-blue-600">·</span>VI
        </div>
        <div className="text-[11px] text-gray-400 font-medium tracking-wide mt-0.5">
          실시간 통역
        </div>
      </div>
    </div>
  )
}
