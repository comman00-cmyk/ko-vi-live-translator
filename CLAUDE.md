# KO-VI Live Translator — CLAUDE.md

## 프로젝트 개요
한국어-베트남어 실시간 통역 웹앱. OpenAI Realtime API(WebRTC), Next.js 15 App Router, Vercel Postgres, Vercel Blob 사용.

## 기술 스택
- **프레임워크**: Next.js 15 App Router + TypeScript
- **인증**: next-auth v5 (Auth.js) + Google OAuth + Prisma Adapter
- **DB**: Vercel Postgres (Prisma ORM)
- **스토리지**: Vercel Blob (녹음 파일)
- **AI**: OpenAI Realtime API (WebRTC, 통역), OpenAI Chat API (요약)
- **UI**: Tailwind CSS, lucide-react, Toss 스타일

## 보안 원칙
- `OPENAI_API_KEY`는 서버에서만 사용. 브라우저에 절대 노출 금지.
- `/api/realtime/session`에서 ephemeral token 발급 → 브라우저는 이 토큰으로 WebRTC 연결.
- 모든 API 라우트는 `auth()` 세션 확인 후 처리.
- 관리자 API는 `isAdminEmail()` 추가 확인.

## 디렉토리 구조
```
app/
  page.tsx              — 홈 (소개 + CTA)
  translate/page.tsx    — 실시간 통역 (로그인 필요)
  records/page.tsx      — 내 통역 기록 (로그인 필요)
  admin/page.tsx        — 관리자 (ADMIN_EMAILS 체크)
  api/
    auth/[...nextauth]/ — NextAuth 핸들러
    realtime/session/   — OpenAI ephemeral token 발급
    summary/            — 보고용 요약 생성
    records/            — 통역 세션 CRUD
    recordings/upload/  — 녹음 파일 → Vercel Blob
    admin/              — 관리자 전용 API (stats/users/glossary/records/settings/logs)
components/
  TranslatorPanel.tsx   — WebRTC 연결 + 자막 표시 (핵심)
  SummaryPanel.tsx      — 보고용 요약 UI
  RecorderControls.tsx  — 브라우저 오디오 녹음
  TossCard.tsx          — 카드 레이아웃
  StatusBadge.tsx       — 연결 상태 배지
  LoginButton.tsx       — Google 로그인/로그아웃
  AdminGuard.tsx        — 서버 컴포넌트 관리자 보호
  AdminNav.tsx          — 관리자 탭 네비게이션
lib/
  auth.ts               — NextAuth 설정
  prisma.ts             — Prisma 클라이언트 싱글톤
  admin.ts              — isAdminEmail 헬퍼
  realtime.ts           — createRealtimeSession (OpenAI API 호출)
  summary.ts            — generateSummary (OpenAI Chat API)
  storage.ts            — uploadRecording (Vercel Blob)
prisma/schema.prisma    — DB 스키마
```

## 핵심 데이터 흐름
1. 브라우저 → `GET /api/realtime/session?direction=ko-vi` → 서버가 OpenAI에서 ephemeral token 발급
2. 브라우저가 ephemeral token으로 OpenAI WebRTC 직접 연결
3. 음성 입력 → `conversation.item.input_audio_transcription.completed` 이벤트 → 원문 표시
4. AI 응답 → `response.text.done` 이벤트 → 번역 표시
5. "세션 저장" → `POST /api/records` → Vercel Postgres 저장
6. 녹음 완료 → `POST /api/recordings/upload` → Vercel Blob 저장
7. "요약 생성" → `POST /api/summary` → OpenAI Chat API → 보고용 요약

## 환경변수 (필수)
```
OPENAI_API_KEY          — OpenAI API 키 (서버 전용)
NEXTAUTH_SECRET         — 세션 암호화 키
GOOGLE_CLIENT_ID        — Google OAuth Client ID
GOOGLE_CLIENT_SECRET    — Google OAuth Client Secret
ADMIN_EMAILS            — 관리자 이메일 (쉼표 구분)
NEXT_PUBLIC_ADMIN_EMAILS — 관리자 이메일 (클라이언트 체크용)
DATABASE_URL            — Vercel Postgres 연결 문자열
DIRECT_URL              — Vercel Postgres 직접 연결 (Prisma 마이그레이션용)
BLOB_READ_WRITE_TOKEN   — Vercel Blob 토큰
```

## 주요 명령어
```bash
npm run dev       # 로컬 개발 서버
npm run build     # 빌드
npm run db:push   # Prisma 스키마 → DB 동기화
npm run db:studio # Prisma Studio (DB GUI)
```
