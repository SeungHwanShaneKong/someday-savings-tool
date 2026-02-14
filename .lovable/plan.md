

# 이미지 저장 + 클립보드 복사 원스톱 자동화 계획

## 현재 상태

현재 `downloadImage` 함수는 html2canvas로 캔버스를 생성한 뒤, 기기별로 다운로드/공유만 수행합니다. 클립보드 복사 기능은 없으며, 캔버스 re-encoding 과정에서 품질 손실 가능성이 있습니다.

## 변경 사항

### 1. `src/lib/download-image.ts` - 클립보드 복사 기능 추가

- **`copyImageToClipboard(blob: Blob)` 함수 추가**: `navigator.clipboard.write`로 PNG Blob을 ClipboardItem으로 복사
- 클립보드 API 미지원 또는 권한 거부 시 조용히 실패 (다운로드는 성공하므로 전체 동작을 중단하지 않음)
- **`downloadAndCopyImage` 함수 추가**: 다운로드와 클립보드 복사를 동시에 수행하는 통합 함수
  - `Promise.allSettled`로 두 작업을 병렬 실행
  - 결과를 `{ downloadResult, clipboardCopied }` 형태로 반환

### 2. `src/pages/Summary.tsx` - 버튼 및 토스트 업데이트

- `handleDownloadImage`에서 새로운 `downloadAndCopyImage` 함수 호출
- 토스트 메시지를 결과에 따라 세분화:
  - 저장 + 복사 모두 성공: "이미지가 저장 및 복사되었어요!"
  - 저장만 성공: "이미지가 저장되었어요!" (기존과 동일)
  - 실패: 기존 에러 토스트

### 3. 품질 보장

- 기존 `canvasToBlob`은 `quality: 1.0`의 PNG를 사용하므로 무손실입니다. html2canvas가 DOM을 캔버스로 렌더링하는 과정 자체가 "캡처"이므로, 원본 소스 이미지가 아닌 화면 캡처 용도에서는 이 방식이 최선입니다.
- scale 값(모바일 2.0, 데스크탑 2.5)은 유지하여 고해상도 출력 보장

### 기술 상세

**클립보드 복사 핵심 코드:**
```typescript
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write) return false;
  try {
    const pngBlob = blob.type === 'image/png' ? blob : /* convert */;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
    return true;
  } catch { return false; }
}
```

**iOS 제한사항**: iOS Safari에서 `clipboard.write`는 사용자 제스처(클릭) 컨텍스트 내에서만 작동합니다. html2canvas가 비동기이므로, iOS에서는 복사가 실패할 수 있습니다. 이 경우 다운로드만 성공으로 처리합니다.

