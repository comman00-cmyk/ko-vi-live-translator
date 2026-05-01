# KO-VI Live Translator — 개발 변경사항

## 현재 알려진 문제 (Active Issues)

### 🔴 WebRTC 연결 타임아웃 (조사 중)
- **증상**: 음성 탭에서 "통역 시작" 클릭 시 20초 후 타임아웃 오류
- **로그 확인 방법**: 브라우저 콘솔(F12 → Console)에서 `[WebRTC Xms]` 로그 확인
- **의심 원인**:
  1. ICE 후보 수집 실패 (STUN 서버 차단 또는 `srflx` 후보 없음)
  2. ICE 연결은 되지만 DTLS 핸드셰이크 실패
  3. `dc.onopen` 미발화 (데이터 채널 협상 문제)
- **디버깅 포인트**: 콘솔에서 아래 순서 확인
  ```
  Step 1: token OK          ← 토큰 발급 확인
  Step 4: mic OK            ← 마이크 권한 확인
  ICE candidate: type=srflx ← srflx 후보 있어야 함 (없으면 STUN 차단)
  ICE candidate: type=relay ← relay면 TURN 사용 중
  Step 7: ICE gathering done — N candidates  ← N > 0 이어야 함
  Step 8: SDP answer received               ← OpenAI 응답 확인
  Step 9: remote description set            ← 여기까지 오면 dc.onopen 기다리는 중
  dc.onopen                                 ← 이게 안 뜨면 ICE/DTLS 문제
  ```

---

## 변경 이력

### [2026-05-01] Safari 호환성 수정 + 동시 통역 음성 옵션 추가

#### Safari WebRTC 수정
| 문제 | 수정 |
|------|------|
| `audioEl.srcObject` 설정 후 재생 안 됨 | `audioEl.play().catch()` 명시적 호출 추가 |
| `addTrack(track)` without stream | `addTrack(track, stream)` — Safari는 stream 전달 필요 |
| `e.streams[0]` undefined 가능성 | `e.streams[0] ?? new MediaStream([e.track])` 폴백 추가 |

#### 동시 통역 음성 출력 토글
- **"동시 통역 음성"** 버튼 추가 (기본: 꺼짐)
- 켜면: `modalities: ['text', 'audio']` → AI가 번역을 음성으로 출력
- 끄면: `modalities: ['text']` → 텍스트만 표시 (비용·지연 절감)
- 연결 중에도 실시간 토글 가능 (`session.update` 전송)
- `voiceOutputRef` 사용 — `dc.onopen` 클로저 stale 방지

#### 화자 분리 UI 개선
- 각 row에 **"원문"** / **"번역"** 라벨 표시
- 번역 스트리밍 중 커서 애니메이션 (`animate-pulse` 블록)
- 짝수/홀수 row 교차 배경색

---

### [2026-05-01] 음성 탭 WebRTC 연결 안정화 작업

#### 문제 현상
- "통역 시작" 클릭 시 `연결 중` 상태에서 무한 대기
- 이후 `연결 안됨` 상태로 표시 (race condition)

#### 원인 분석
1. **`new RTCPeerConnection()` — STUN 서버 없음**
   - 브라우저가 자신의 public IP를 몰라 `host` 타입 ICE 후보만 생성
   - OpenAI 서버가 연결 경로를 못 찾아 ICE 협상 실패
2. **`offer.sdp` 전송 (ICE gathering 전)**
   - ICE 후보가 포함되지 않은 SDP를 OpenAI에 전송
   - 연결 불가
3. **Race condition: `dc.onclose`가 `error` 상태를 덮어씀**
   - `destroyConnection()` → `dc.close()` → (비동기) `dc.onclose` → `setStatus('disconnected')`
   - `setStatus('error')` 이후에 `disconnected`로 덮어써져 오류 메시지 사라짐

#### 적용한 수정
- STUN 서버 추가 (`stun.l.google.com:19302`, `stun1.l.google.com:19302`)
- `waitForIceGathering(pc)` 함수 추가 — ICE 수집 완료 후 SDP 전송
- `pc.localDescription.sdp` 사용 (최종 SDP, ICE 후보 포함)
- `destroyConnection()` 에서 `dc.onclose = null` 먼저 처리 → ghost callback 차단
- `dc.onclose`에 조건 추가: `statusRef.current === 'connected'` 일 때만 `disconnected` 설정
- `pc.onconnectionstatechange`, `pc.oniceconnectionstatechange` 핸들러 추가
- 20초 타임아웃 추가

#### 추가된 로그 (콘솔)
- 각 step별 타임스탬프 로그 (`[WebRTC Xms]`)
- ICE candidate 타입/프로토콜/주소 로그
- ICE gathering state, connection state 변화 로그

---

### [2026-05-01] 음성 탭 재설계 — 자동 언어 감지 + 대화 쌍 표시

#### 변경 내용
- `TranslatorPanel.tsx` 전면 재작성
- 방향 선택(한→베, 베→한) 제거 → **자동 감지**로 통합
- 기존 텍스트 누적 방식 → **대화 쌍(Pair)** 구조로 변경
- 한국어 컬럼 | 베트남어 컬럼 — 매칭되어 표시
- `response.text.delta` 스트리밍 번역 지원
- `response.audio_transcript.done` 폴백 처리
- `dc.onopen` 후 `session.update` 전송 (VAD + transcription 설정 재확인)

#### `lib/realtime.ts` 변경
- direction 파라미터 제거 → 항상 auto 모드
- VAD threshold: `0.5 → 0.3` (인식률 개선)
- silence_duration_ms: `600 → 500`
- prefix_padding_ms: `300 → 200`

---

### [2026-05-01] 텍스트 양방향 번역 패널 추가

#### 추가된 파일
- `components/TextTranslatorPanel.tsx`
- `app/api/translate/route.ts`

#### 기능
- 한국어 / 베트남어 textarea 양쪽 입력 가능
- 타이핑 후 0.6초 debounce → `POST /api/translate` → 반대 언어 자동 번역
- `activeSide` ref로 무한 번역 루프 방지
- 로딩 스피너, 복사 버튼

#### translate 페이지 구조 변경
- `[텍스트] [음성]` 탭 추가
- 기본 탭: 텍스트
- SummaryPanel은 두 탭 공유

---

### [2026-05-01] Google OAuth 인증 수정

#### 문제
- 포트 3000이 이전 dev 세션에 점유 → 새 서버가 3001로 기동
- Google OAuth 콜백 URL `http://localhost:3000/api/auth/callback/google` 고정
- NEXTAUTH_URL=http://localhost:3000 불일치로 인증 실패

#### 수정
- `pkill -f "next dev"` 로 이전 세션 종료
- 항상 포트 3000으로 기동하도록 정리
- Google Cloud Console에 콜백 URL 등록 확인

---

### [2026-04-30] MVP 초기 구현

#### 구현된 기능
- Next.js 15 App Router + TypeScript
- NextAuth v5 (Auth.js) + Google OAuth + Prisma Adapter
- Vercel Postgres (Prisma ORM) — 9개 모델
- Vercel Blob (녹음 파일)
- OpenAI Realtime API (WebRTC) — 음성 통역
- OpenAI Chat API — 요약 생성
- 관리자 패널 (stats, users, glossary, records, settings, logs)

#### 완료된 파일 (34개)
```
lib/              prisma, auth, admin, realtime, summary, storage
components/       TranslatorPanel, SummaryPanel, RecorderControls,
                  TossCard, StatusBadge, LoginButton, AdminGuard, AdminNav
app/api/          auth, realtime/session, summary, records,
                  recordings/upload, admin(6개), translate
app/              layout, page, translate/page, records/page, admin/page
```

---

## 환경 정보

| 항목 | 값 |
|------|----|
| Node.js | v24.15.0 (nvm) |
| Next.js | 15.5.x |
| next-auth | 5.0.0-beta.25 |
| OpenAI Realtime Model | gpt-4o-realtime-preview |
| OpenAI Summary Model | gpt-4.1-mini |
| DB | Vercel Postgres (Prisma) |
| Storage | Vercel Blob |

## 다음 작업 예정

- [ ] WebRTC 연결 타임아웃 근본 원인 해결
- [ ] Vercel 배포 + 환경변수 등록
- [ ] 실제 환경에서 음성 인식 테스트
- [ ] 음성 인식률 추가 튜닝 (VAD 파라미터)
