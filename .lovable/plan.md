

# 무손실 원본 이미지 자동 저장 시스템 최적화

## 현재 상태 분석

`src/lib/download-image.ts`의 이미지 저장 로직은 이미 클립보드 복사 코드를 포함하지 않습니다. 다른 파일(Auth, Landing 등)의 클립보드 기능은 URL/계좌번호 복사용이므로 이미지 저장과 무관합니다.

현재 문제점:
- iOS Safari에서 `download` 속성이 무시되어 이미지가 새 탭에서 열림 (사용자가 길게 눌러 저장해야 함)
- Web Share API 실패 시 iOS 폴백이 불편함 (새 탭 열기)
- canvas에서 Blob 변환 시 `quality: 1.0`이지만 canvas 렌더링 자체가 원본 대비 손실 가능

## 수정 계획

### 1. `src/lib/download-image.ts` - 모바일 다운로드 전략 강화

**변경 사항:**
- iOS에서 Web Share API를 최우선으로 사용 (공유 시트에서 "이미지 저장" 가능)
- Web Share 실패 시 Blob URL을 `a[download]` 태그로 시도
- 최종 폴백으로 새 탭 열기 (길게 눌러 저장 안내)
- `openImageForSave` 함수에서 Blob URL 해제 타이머를 60초에서 120초로 연장 (저속 네트워크 대비)
- 연속 클릭 방지를 위한 debounce 플래그 추가
- canvas Blob 변환 시 PNG 포맷 + quality 1.0 유지 (무손실)

**핵심 변경:**
```text
모바일 저장 흐름:
1. Web Share API 시도 (iOS/Android 모두)
   -> 성공: 갤러리 저장 완료
2. Blob + anchor download 시도
   -> Android: 대부분 성공
   -> iOS: download 속성 무시될 수 있음
3. 최종 폴백: 새 탭에서 이미지 열기
   -> 사용자에게 "길게 눌러 저장" 안내
```

### 2. `src/pages/Summary.tsx` - 토스트 메시지 및 중복 클릭 방지

**변경 사항:**
- `handleDownloadImage`에 `isDownloading` 상태 추가하여 연속 클릭 방지
- 버튼에 로딩 상태 표시
- 에러 발생 시 구체적 안내 메시지 제공

### 기술 세부사항

- `canvasToBlob`의 MIME type `image/png` + quality `1.0` 유지 (무손실 보장)
- Blob URL cleanup을 `setTimeout`으로 안전하게 처리 (메모리 누수 방지)
- `navigator.canShare` 체크로 Share API 지원 여부 사전 검증
- 파일명에 한글 포함 시 `encodeURIComponent` 불필요 (File API가 자동 처리)

