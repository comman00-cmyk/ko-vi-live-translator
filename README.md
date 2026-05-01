# KO-VI 실시간 통역 — 설치 및 운영 가이드

한국어 ↔ 베트남어 실시간 통역 웹사이트입니다.
Mac 초보자도 따라할 수 있도록 모든 단계를 상세히 작성했습니다.

---

## 목차

1. [최초 폴더 생성](#1-최초-폴더-생성)
2. [패키지 설치](#2-패키지-설치)
3. [.env.local 작성](#3-envlocal-작성)
4. [OpenAI API Key 발급](#4-openai-api-key-발급)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Vercel Postgres 생성](#6-vercel-postgres-생성)
7. [Vercel Blob 생성](#7-vercel-blob-생성)
8. [Prisma DB 준비](#8-prisma-db-준비)
9. [로컬 실행](#9-로컬-실행)
10. [Git 초기화](#10-git-초기화)
11. [GitHub 연결](#11-github-연결)
12. [Vercel 배포](#12-vercel-배포)
13. [Vercel 환경변수 등록](#13-vercel-환경변수-등록)
14. [운영 배포 후 확인 방법](#14-운영-배포-후-확인-방법)
15. [보안 주의사항](#15-보안-주의사항)
16. [장애 발생 시 확인 방법](#16-장애-발생-시-확인-방법)

---

## 1. 최초 폴더 생성

터미널을 열고 아래 명령어를 실행합니다.

```bash
cd ~
mkdir ko-vi-live-translator
cd ko-vi-live-translator
```

> 💡 터미널은 Mac에서 `Command + Space` → "터미널" 검색으로 열 수 있습니다.

---

## 2. 패키지 설치

아래 명령어를 실행하여 필요한 패키지를 모두 설치합니다.

```bash
npm install
```

설치에 2~3분 정도 걸립니다. 오류 없이 완료되면 됩니다.

---

## 3. .env.local 작성

환경변수 파일을 만듭니다. 먼저 예시 파일을 복사합니다.

```bash
cp .env.local.example .env.local
```

그다음 텍스트 에디터로 `.env.local` 파일을 열어 값을 채웁니다.

```bash
open -e .env.local
```

> 아래 4~7단계에서 각 항목의 값을 얻는 방법을 설명합니다.

---

## 4. OpenAI API Key 발급

1. 브라우저에서 `platform.openai.com` 접속
2. 로그인 → 상단 메뉴 **API Keys** 클릭
3. **Create new secret key** 클릭
4. 이름 입력 (예: `ko-vi-translator`) → **Create secret key**
5. 화면에 표시된 키 (`sk-...`)를 복사
6. `.env.local` 파일의 `OPENAI_API_KEY=` 뒤에 붙여넣기

> ⚠️ API Key는 화면을 닫으면 다시 볼 수 없습니다. 반드시 저장하세요.

---

## 5. Google OAuth 설정

### 5-1. Google Cloud 프로젝트 생성

1. `console.cloud.google.com` 접속
2. 상단 **프로젝트 선택** → **새 프로젝트**
3. 프로젝트 이름: `ko-vi-translator` → **만들기**

### 5-2. OAuth 동의 화면 설정

1. 왼쪽 메뉴 **API 및 서비스** → **OAuth 동의 화면**
2. 사용자 유형: **외부** → **만들기**
3. 앱 이름, 사용자 지원 이메일 입력 → **저장 후 계속**
4. 나머지 단계는 기본값으로 **저장 후 계속**

### 5-3. OAuth 자격증명 생성

1. **사용자 인증 정보** → **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션**
3. 승인된 리디렉션 URI 추가:
   - 로컬: `http://localhost:3000/api/auth/callback/google`
   - 운영 (나중에 추가): `https://배포주소.vercel.app/api/auth/callback/google`
4. **만들기** → 클라이언트 ID, 클라이언트 보안 비밀번호 복사
5. `.env.local`에 입력:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

### 5-4. NEXTAUTH_SECRET 생성

터미널에서 아래 명령어 실행 후 출력값을 `NEXTAUTH_SECRET=` 뒤에 붙여넣기:

```bash
openssl rand -base64 32
```

---

## 6. Vercel Postgres 생성

1. `vercel.com` 접속 → 로그인
2. 대시보드에서 **Storage** 탭 클릭
3. **Create Database** → **Postgres** 선택
4. 데이터베이스 이름 입력 (예: `ko-vi-db`) → **Create**
5. 생성 후 **`.env.local` 탭** 클릭
6. `DATABASE_URL`과 `DIRECT_URL` 값 복사 → `.env.local`에 붙여넣기

---

## 7. Vercel Blob 생성

1. Vercel 대시보드 **Storage** → **Create Database** → **Blob** 선택
2. 이름 입력 (예: `ko-vi-recordings`) → **Create**
3. 생성 후 **`.env.local` 탭** 클릭
4. `BLOB_READ_WRITE_TOKEN` 값 복사 → `.env.local`에 붙여넣기

---

## 8. Prisma DB 준비

`.env.local`이 완성되면 DB 테이블을 생성합니다.

```bash
npm run db:generate
npm run db:push
```

성공하면 아래와 같이 출력됩니다:
```
✓ Generated Prisma Client
✓ Your database is now in sync with your Prisma schema.
```

DB 내용을 GUI로 확인하려면:

```bash
npm run db:studio
```

---

## 9. 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 을 열면 서비스가 실행됩니다.

**확인할 것:**
- [ ] 홈 화면이 표시되는가
- [ ] Google 로그인이 작동하는가
- [ ] `/translate` 페이지에서 "시작" 버튼이 있는가

---

## 10. Git 초기화

```bash
git init
git add .
git commit -m "Initial commit: KO-VI realtime translator"
git branch -M main
```

---

## 11. GitHub 연결

1. `github.com` 접속 → 로그인 → **New repository**
2. Repository name: `ko-vi-live-translator`
3. **Private** 선택 (API Key 보호) → **Create repository**
4. 아래 명령어 실행 (본인 계정으로 변경):

```bash
git remote add origin https://github.com/본인계정/ko-vi-live-translator.git
git push -u origin main
```

> GitHub 사용자명과 비밀번호 또는 Personal Access Token이 필요합니다.

---

## 12. Vercel 배포

### Vercel CLI 설치 및 배포

```bash
npm install -g vercel
vercel login
vercel
```

`vercel` 명령어 실행 시 질문에 답합니다:
- **Set up and deploy?** → Y
- **Which scope?** → 본인 계정 선택
- **Link to existing project?** → N
- **Project name?** → `ko-vi-live-translator` (엔터)
- **Directory?** → `.` (엔터)

Preview 배포가 완료됩니다.

### 운영 배포

```bash
vercel --prod
```

배포 완료 후 제공되는 URL을 메모해 두세요 (예: `https://ko-vi-live-translator.vercel.app`).

---

## 13. Vercel 환경변수 등록

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**에서 아래 항목을 모두 등록합니다.

| 변수명 | 값 |
|--------|-----|
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENAI_REALTIME_MODEL` | `gpt-4o-realtime-preview` |
| `OPENAI_SUMMARY_MODEL` | `gpt-4.1-mini` |
| `NEXTAUTH_SECRET` | 로컬에서 생성한 랜덤 문자열 |
| `NEXTAUTH_URL` | `https://배포주소.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `ADMIN_EMAILS` | 관리자 Google 이메일 |
| `NEXT_PUBLIC_ADMIN_EMAILS` | 관리자 Google 이메일 (동일값) |
| `DATABASE_URL` | Vercel Postgres URL |
| `DIRECT_URL` | Vercel Postgres Direct URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Token |

등록 후 **Redeploy** 버튼으로 재배포합니다.

### Google OAuth Redirect URI 추가

Google Cloud Console → OAuth 자격증명 → 편집 → 승인된 리디렉션 URI에 운영 URL 추가:

```
https://배포주소.vercel.app/api/auth/callback/google
```

---

## 14. 운영 배포 후 확인 방법

### 기본 확인

```bash
# 현재 배포 상태 확인
vercel ls

# 최신 배포 로그 확인
vercel logs --follow

# Git 변경 후 재배포
git add .
git commit -m "변경 내용 설명"
git push origin main
vercel --prod
```

### 확인 체크리스트

- [ ] `https://배포주소.vercel.app` 홈 화면 접속
- [ ] Google 로그인 정상 작동
- [ ] `/translate` 페이지 마이크 권한 요청 확인
- [ ] 시작 버튼 클릭 후 "연결됨" 상태 확인
- [ ] 한국어로 말한 후 베트남어 번역 표시 확인
- [ ] 세션 저장 기능 확인
- [ ] `/records` 페이지에 저장된 기록 표시 확인
- [ ] `/admin` 관리자 페이지 접속 확인

---

## 15. 보안 주의사항

1. **`.env.local` 파일은 절대 GitHub에 올리지 마세요.** `.gitignore`에 포함되어 있지만 반드시 확인하세요.

2. **API Key 노출 방지**: `OPENAI_API_KEY`는 `NEXT_PUBLIC_` 접두사 없이 서버 전용으로만 사용합니다.

3. **NEXTAUTH_SECRET**: 운영 환경에서는 별도의 강력한 랜덤값을 사용하세요.
   ```bash
   openssl rand -base64 32
   ```

4. **관리자 이메일**: `ADMIN_EMAILS`에 신뢰할 수 있는 이메일만 등록하세요.

5. **GitHub Repository를 Private으로 설정**: 환경변수나 비밀값이 코드에 섞이지 않도록 주의하세요.

6. **Vercel Postgres**: 외부에서 직접 접근하지 않도록 Connection Pooling을 활성화하세요.

---

## 16. 장애 발생 시 확인 방법

### 서비스가 전혀 안 열릴 때

```bash
vercel logs --follow
```

500 에러가 보이면 환경변수 누락 여부를 확인합니다.

### Google 로그인이 안 될 때

1. Google Cloud Console → OAuth 자격증명 → Redirect URI 확인
2. `NEXTAUTH_URL`이 실제 배포 URL과 일치하는지 확인
3. `NEXTAUTH_SECRET`이 등록되어 있는지 확인

### 통역이 시작 안 될 때 (연결 실패)

1. `/admin` → 에러 로그 탭 확인
2. `OPENAI_API_KEY` 유효성 확인 (platform.openai.com에서 키 상태 확인)
3. `OPENAI_REALTIME_MODEL` 값이 `gpt-4o-realtime-preview`인지 확인
4. 브라우저 개발자 도구 (F12) → Console 탭에서 오류 메시지 확인

### DB 오류가 날 때

```bash
npm run db:push
```

Vercel Postgres 대시보드에서 연결 상태를 확인합니다.

### 녹음 업로드가 안 될 때

1. `BLOB_READ_WRITE_TOKEN` 등록 여부 확인
2. Vercel Blob 대시보드에서 스토리지 한도 확인

### 빌드 오류가 날 때

```bash
npm run build
```

로컬에서 빌드를 실행하여 오류 메시지를 확인합니다.

---

## 빠른 참고

```bash
# 로컬 실행
npm run dev

# DB 동기화
npm run db:push

# DB GUI
npm run db:studio

# 빌드 확인
npm run build

# Vercel 배포
vercel --prod

# 배포 로그
vercel logs --follow

# Git 커밋 & 푸시
git add .
git commit -m "설명"
git push origin main
```
