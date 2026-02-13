

# iOS 인앱 브라우저 Safari 강제 전환 - 완벽 수정 계획

## 문제 원인 분석

현재 iOS에서 사용 중인 `shortcuts://x-callback-url/run-shortcut` 방식은 **iOS 18.1 이후 작동하지 않는 것으로 확인**되었습니다 (Paul's Weblog 및 Apple 커뮤니티에서 보고됨). iPhone 10~15 전 모델에서 실패하는 이유가 바로 이것입니다.

## 해결 전략: 다중 탈출 방식 (Multi-Escape Strategy)

iOS에는 Android의 `intent://`처럼 확실한 단일 방법이 없으므로, **여러 방법을 순차적으로 시도**하는 전략을 적용합니다.

### 수정 파일 및 내용

#### 1. `src/lib/kakao-browser.ts` - iOS 탈출 로직 전면 재설계

iOS 전략을 다음 우선순위로 변경:

1. **카카오톡 전용**: `kakaotalk://web/openExternal` (기존 유지)
2. **Safari 직접 스킴**: `x-safari-https://example.com` - Safari를 직접 호출하는 URL 스킴 (shalanah/inapp-debugger에서 확인된 방법)
3. **Shortcuts 폴백**: 기존 `shortcuts://x-callback-url` 방식도 일부 구형 iOS(17 이하)에서는 작동하므로 2차 시도로 유지
4. **최종 폴백**: 브릿지 UI 표시

구체적으로:
- `openInExternalBrowser` 함수의 iOS 분기를 재작성
- Safari 스킴 시도 후 타이머로 성공 여부 감지 (페이지 이탈 시 `visibilitychange` 이벤트 활용)
- 실패 시 Shortcuts 방식 시도
- 두 방법 모두 실패 시 `false` 반환하여 브릿지 UI로 전환

#### 2. `src/pages/Auth.tsx` - 브릿지 UI 즉시 표시 + 앱별 맞춤 안내

- 자동 전환 대기 시간을 1500ms에서 **800ms**로 단축 (사용자가 빈 화면을 오래 보지 않도록)
- 브릿지 UI의 iOS 안내를 **앱별로 구체화**:
  - Instagram/Threads: "우측 하단 ... 아이콘 → Safari로 열기"
  - 카카오톡: "우측 상단 ... → 외부 브라우저로 열기"
  - 기타: 일반적인 "공유 → Safari로 열기" 안내
- URL 복사 버튼을 더 눈에 띄게 강조

#### 3. `src/pages/Landing.tsx` - 동일한 즉시 전환 로직 적용

- Landing에서도 동일한 다중 탈출 전략 적용
- 실패 시 브릿지 UI 상태 추가 (현재는 조용히 실패함)

---

## 기술 상세

```text
iOS 탈출 시도 흐름:
+------------------+
| 인앱 브라우저 감지 |
+--------+---------+
         |
    +----v-----+
    | 카카오톡?  |--Yes--> kakaotalk://web/openExternal
    +----+-----+
         | No
    +----v--------------+
    | x-safari-https:// |--성공--> Safari 열림
    | 스킴 시도           |
    +----+--------------+
         | 실패 (800ms 후)
    +----v--------------+
    | shortcuts://       |--성공--> Safari 열림
    | x-callback-url     |
    +----+--------------+
         | 실패
    +----v--------------+
    | 브릿지 UI 표시      |
    | (앱별 맞춤 안내)     |
    +-------------------+
```

### 핵심 코드 변경 (`openInExternalBrowser` iOS 부분):

- `x-safari-https://` 스킴을 1차로 시도
- `document.addEventListener('visibilitychange')` 또는 `setTimeout`으로 성공 여부 감지
- 새로운 `openInExternalBrowserWithFallback()` 비동기 함수 추가: 여러 방법을 순차 시도하고 결과를 콜백으로 전달

### 검증 시나리오 (10가지):

1. iPhone + Instagram IAB → Safari 스킴 시도 → 성공/실패 시 브릿지 UI
2. iPhone + Threads IAB → 동일 흐름
3. iPhone + 카카오톡 → 전용 스킴으로 즉시 전환
4. iPhone + Facebook IAB → Safari 스킴 시도
5. iPhone + 네이버 앱 IAB → Safari 스킴 시도
6. iPhone + LINE IAB → Safari 스킴 시도
7. Galaxy + Instagram → intent:// 로 Chrome 실행
8. 일반 Safari 접속 → 감지 로직 미작동, 정상 로그인
9. 일반 Chrome 접속 → 감지 로직 미작동, 정상 로그인
10. 브릿지 UI에서 URL 복사 → Safari에 붙여넣기 후 정상 로그인

