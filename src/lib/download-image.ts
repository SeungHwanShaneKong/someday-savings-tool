/**
 * Multi-device lossless image download utility
 * 
 * Download strategy per platform:
 * 
 * [iOS Safari]  Web Share API → anchor download → new tab (long-press save)
 *   - iOS Safari ignores the `download` attribute on <a> tags, so Web Share API
 *     is the only reliable way to trigger "Save to Photos" natively.
 *   - If Web Share fails, anchor download is attempted (works on iOS Chrome/Firefox).
 *   - Final fallback opens image in new tab for manual long-press save.
 * 
 * [Android Chrome/Samsung Internet]  Web Share API → anchor download
 *   - Android respects the `download` attribute, so anchor download is reliable.
 *   - Web Share API provides a nicer UX with native share sheet.
 * 
 * [Desktop]  Anchor download (direct to Downloads folder)
 * 
 * Quality: PNG format, quality 1.0 — lossless pixel integrity guaranteed.
 * No clipboard operations — pure download/share only.
 */

let isProcessing = false;

/** Detect mobile devices (iOS + Android) */
function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Detect iOS specifically — Safari ignores download attribute */
function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Convert canvas to Blob with lossless PNG encoding.
 * Uses image/png with quality 1.0 to preserve every pixel without compression artifacts.
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
 * Stage 1: Web Share API
 * Best for mobile — triggers native OS share sheet where users can tap "Save Image"
 * to save directly to their photo gallery.
 * 
 * Supported: iOS 15+ Safari, Android Chrome 75+, Samsung Internet 11+
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
    // AbortError = user cancelled the share sheet — not a failure
    if (err instanceof Error && err.name === 'AbortError') return true;
    return false;
  }
}

/**
 * Stage 2: Blob URL + hidden anchor tag with download attribute
 * 
 * Android: Chrome and Samsung Internet respect the `download` attribute,
 * triggering an immediate file download to the Downloads folder (auto-scanned by gallery).
 * 
 * iOS Safari: The `download` attribute is IGNORED — this will open the blob in-browser.
 * That's why iOS has an additional Stage 3 fallback.
 * 
 * Desktop: Works reliably on all major browsers.
 */
function downloadViaAnchor(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  // Set explicit type to help browser recognize this as a downloadable file
  link.type = 'image/png';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup after download initiates — 500ms buffer for slow devices
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Stage 3 (iOS-only fallback): Open image in new tab
 * When Web Share API fails and anchor download is ignored by iOS Safari,
 * this opens the raw image in a new tab where users can long-press → "Add to Photos".
 * 
 * Blob URL cleanup is delayed 120s to accommodate slow networks and user interaction time.
 */
function openImageInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    // Popup blocked — try anchor with target=_blank as last resort
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
  }
  // Extended cleanup: user needs time to long-press and save
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

/**
 * Main download entry point — orchestrates the platform-specific download chain.
 * 
 * Includes debounce protection (1.5s cooldown) to prevent duplicate downloads
 * from rapid consecutive clicks.
 * 
 * @returns 'downloaded' | 'shared' | 'opened' — indicates which method succeeded
 * @throws Error if called while another download is still processing
 */
export async function downloadImage(
  canvas: HTMLCanvasElement,
  fileName: string = '웨딩셈_예산요약.png'
): Promise<'downloaded' | 'shared' | 'opened'> {
  // Debounce guard: prevent rapid consecutive calls
  if (isProcessing) {
    throw new Error('이미지 저장이 진행 중입니다');
  }

  isProcessing = true;

  try {
    const blob = await canvasToBlob(canvas);

    if (isMobileDevice()) {
      // Stage 1: Try Web Share API (best UX — native "Save Image" option)
      const shared = await tryWebShare(blob, fileName);
      if (shared) return 'shared';

      if (isIOS()) {
        // Stage 2 (iOS): Try anchor download — works on iOS Chrome/Firefox
        // but iOS Safari will ignore the download attribute
        downloadViaAnchor(blob, fileName);

        // Stage 3 (iOS Safari fallback): Open in new tab for long-press save
        // We always trigger this on iOS because we can't reliably detect
        // whether the anchor download was honored by the browser
        setTimeout(() => {
          openImageInNewTab(blob);
        }, 300);
        return 'opened';
      }

      // Android: anchor download is reliable — triggers system download manager
      downloadViaAnchor(blob, fileName);
      return 'downloaded';
    }

    // Desktop: standard anchor download to Downloads folder
    downloadViaAnchor(blob, fileName);
    return 'downloaded';
  } finally {
    // Reset debounce after 1.5s cooldown
    setTimeout(() => {
      isProcessing = false;
    }, 1500);
  }
}
