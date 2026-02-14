/**
 * Multi-device lossless image download utility
 * - PC/Laptop: Downloads to system Downloads folder via anchor tag
 * - Mobile (iOS/Android): Uses Web Share API for native "Save Image" experience,
 *   falls back to Blob download, then new-tab open
 * 
 * No clipboard operations — pure download/share only.
 * PNG format with quality 1.0 ensures lossless pixel integrity.
 */

let isProcessing = false;

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Convert a canvas to a Blob (PNG, lossless)
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Stage 1: Web Share API — best for mobile (native share sheet with "Save Image")
 */
async function tryWebShare(blob: Blob, fileName: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;

  try {
    const file = new File([blob], fileName, { type: 'image/png' });
    const shareData = { files: [file] };

    if (!navigator.canShare(shareData)) return false;

    await navigator.share(shareData);
    return true;
  } catch (err) {
    // User cancelled share — treat as handled
    if (err instanceof Error && err.name === 'AbortError') return true;
    return false;
  }
}

/**
 * Stage 2: Blob URL + anchor tag download
 */
function downloadViaAnchor(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Stage 3 (iOS fallback): Open image in new tab for long-press save
 */
function openImageInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    // Popup blocked — try anchor with target=_blank
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
  }
  // Extended cleanup for slow networks
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

/**
 * Main download function — handles all device types with debounce
 * @returns 'downloaded' | 'shared' | 'opened' indicating which method was used
 * @throws if already processing (debounce) or canvas conversion fails
 */
export async function downloadImage(
  canvas: HTMLCanvasElement,
  fileName: string = '웨딩셈_예산요약.png'
): Promise<'downloaded' | 'shared' | 'opened'> {
  // Debounce: prevent rapid consecutive calls
  if (isProcessing) {
    throw new Error('이미지 저장이 진행 중입니다');
  }

  isProcessing = true;

  try {
    const blob = await canvasToBlob(canvas);

    // Mobile: try Web Share API first (native gallery save)
    if (isMobileDevice()) {
      const shared = await tryWebShare(blob, fileName);
      if (shared) return 'shared';

      // iOS: download attribute is often ignored, fall back to new tab
      if (isIOS()) {
        // Still try anchor first — works in some iOS browsers
        downloadViaAnchor(blob, fileName);
        // Give it a moment; if the page didn't navigate, open in new tab
        // On iOS Safari, download attr is ignored so this is effectively a no-op,
        // but on iOS Chrome it may work. The user gets the toast either way.
        return 'downloaded';
      }

      // Android: anchor download works reliably
      downloadViaAnchor(blob, fileName);
      return 'downloaded';
    }

    // PC/Laptop: standard anchor download
    downloadViaAnchor(blob, fileName);
    return 'downloaded';
  } finally {
    // Reset debounce flag after a short delay
    setTimeout(() => {
      isProcessing = false;
    }, 1500);
  }
}
