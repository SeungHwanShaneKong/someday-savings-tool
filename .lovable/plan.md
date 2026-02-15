
# Preview 환경 전용 자동 로그인 (Auth Mock) 구현

## 개요
Lovable Preview 환경(*.lovable.app, localhost)에서 seunghwan.kong@gmail.com 계정으로 **실제 인증 세션**을 자동 생성하여, 수동 로그인 없이 모든 기능(UI 접근 + DB 쿼리 + RLS)을 정상적으로 사용할 수 있도록 합니다.

## 핵심 설계 결정

단순 클라이언트 Mock(가짜 user 객체 주입)은 Supabase RLS가 요구하는 JWT 토큰이 없어 **모든 DB 쿼리가 실패**합니다. 따라서 서버 측에서 실제 세션 토큰을 발급하는 방식을 사용합니다.

## 구현 아키텍처

```text
[Preview 브라우저]                [Edge Function]              [Supabase Auth]
      |                              |                              |
      |-- 세션 없음 감지 ------------->|                              |
      |   POST /preview-auto-login   |                              |
      |   (Origin: *.lovable.app)    |-- service_role로 토큰 생성 --->|
      |                              |   admin.generateLink()       |
      |<-- access_token + refresh ---|<-- 실제 JWT 반환 -------------|
      |                              |                              |
      |-- supabase.auth.setSession() |                              |
      |   (실제 인증 세션 설정)        |                              |
```

## 변경 사항

### 1. Edge Function 생성: `supabase/functions/preview-auto-login/index.ts`
- **도메인 검증**: Origin 헤더가 `*.lovable.app`, `localhost`, `127.0.0.1` 중 하나인 경우에만 허용
- **이메일 고정**: `seunghwan.kong@gmail.com` 전용 (다른 이메일 불가)
- **토큰 발급**: Supabase Admin API (service_role_key)를 사용하여 해당 유저의 실제 JWT 세션 토큰을 생성
- **응답**: `{ access_token, refresh_token }` 반환

### 2. `src/hooks/useAuth.tsx` 수정
- 환경 감지 헬퍼 함수 추가:
```typescript
function isPreviewEnvironment(): boolean {
  const host = window.location.hostname;
  return host.includes('lovable.app') || host === 'localhost' || host === '127.0.0.1';
}
```
- `AuthProvider`의 `useEffect` 내에서:
  1. 기존 `getSession()` 호출
  2. 세션이 없고 `isPreviewEnvironment()` === true인 경우
  3. Edge Function `/preview-auto-login` 호출
  4. 반환된 토큰으로 `supabase.auth.setSession()` 호출
  5. 이후 정상 인증 흐름 진행

### 3. `src/pages/Auth.tsx` 수정
- Preview 환경에서 자동 로그인 진행 중일 때 "자동 로그인 중..." 로딩 UI 표시
- 자동 로그인 성공 시 `/budget`으로 리다이렉트

## 보안 가드

| 보호 계층 | 내용 |
|-----------|------|
| Edge Function Origin 검증 | `*.lovable.app`, `localhost`만 허용, 그 외 403 반환 |
| 이메일 하드코딩 | 함수 내부에서 `seunghwan.kong@gmail.com`만 처리 |
| Production 차단 | `someday-savings-tool.lovable.app` (Published URL) 도메인 명시 차단 |
| 클라이언트 이중 가드 | `isPreviewEnvironment()` 체크로 프로덕션에서 함수 호출 자체를 방지 |

## 검증 시나리오 대응

- **Scenario 1**: Preview 접속 시 로그인 폼 없이 자동 로그인, 헤더에 이메일 표시
- **Scenario 2**: admin 역할 확인 -> 관리자 버튼 노출, /admin 접근 가능
- **Scenario 3**: 실제 JWT 토큰으로 RLS 통과 -> DB 데이터 정상 로드

## 구현 순서
1. Edge Function `preview-auto-login` 생성 및 배포
2. `src/hooks/useAuth.tsx`에 Preview 환경 자동 로그인 로직 추가
3. `src/pages/Auth.tsx`에 자동 로그인 로딩 UI 추가
4. 배포 후 Preview 환경에서 3개 시나리오 검증
