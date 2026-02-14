/**
 * Multi-device image download utility
 * - PC/Laptop: Downloads to system Downloads folder via anchor tag
 * - Mobile (iOS/Android): Uses Web Share API for native "Save Image" experience,
 *   falls back to Blob download with proper MIME type
 */

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

/**
 * Convert a canvas to a Blob with proper MIME type
 */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      mimeType,
      1.0
    );
  });
}

/**
 * Download image using Web Share API (best for mobile - shows native share sheet
 * with "Save Image" option)
 */
async function shareImage(blob: Blob, fileName: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;

  try {
    const file = new File([blob], fileName, { type: blob.type });
    const shareData = { files: [file] };

    if (!navigator.canShare(shareData)) return false;

    await navigator.share(shareData);
    return true;
  } catch (err) {
    // User cancelled share - not an error
    if (err instanceof Error && err.name === 'AbortError') return true;
    return false;
  }
}

/**
 * Download image using Blob URL + anchor tag (best for PC)
 */
function downloadViaAnchor(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup after a short delay to ensure download starts
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * iOS Safari fallback: open image in new tab for long-press save
 */
function openImageForSave(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    // Popup blocked - fall back to anchor download
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
  }
  // Don't revoke URL immediately - user needs time to save
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Copy image to clipboard using Clipboard API
 * Returns true if successful, false if unsupported or permission denied.
 * Silently fails — download is the primary action.
 */
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  // Clipboard API requires secure context (HTTPS) and write permission
  if (!navigator.clipboard?.write) return false;

  try {
    // ClipboardItem only accepts image/png in most browsers
    const pngBlob = blob.type === 'image/png'
      ? blob
      : await convertToPngBlob(blob);

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);
    return true;
  } catch {
    // Permission denied or gesture context lost (common on iOS Safari
    // when html2canvas runs async before clipboard.write)
    return false;
  }
}

/**
 * Convert any image blob to PNG via an off-screen canvas (fallback only)
 */
function convertToPngBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG conversion failed'))),
        'image/png',
        1.0,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/**
 * Main download function - handles all device types
 * @returns 'downloaded' | 'shared' | 'opened' indicating which method was used
 */
export async function downloadImage(
  canvas: HTMLCanvasElement,
  fileName: string = '웨딩셈_예산요약.png'
): Promise<'downloaded' | 'shared' | 'opened'> {
  const blob = await canvasToBlob(canvas, 'image/png');

  // Mobile: try Web Share API first (native "Save Image" experience)
  if (isMobileDevice()) {
    const shared = await shareImage(blob, fileName);
    if (shared) return 'shared';

    // iOS Safari fallback: open in new tab for long-press save
    if (isIOSSafari()) {
      openImageForSave(blob);
      return 'opened';
    }

    // Android / other mobile: use anchor download
    downloadViaAnchor(blob, fileName);
    return 'downloaded';
  }

  // PC/Laptop: standard anchor download
  downloadViaAnchor(blob, fileName);
  return 'downloaded';
}

/**
 * One-stop function: download/share image AND copy to clipboard simultaneously.
 * Uses Promise.allSettled so clipboard failure never blocks download.
 * @returns { downloadResult, clipboardCopied }
 */
export async function downloadAndCopyImage(
  canvas: HTMLCanvasElement,
  fileName: string = '웨딩셈_예산요약.png'
): Promise<{ downloadResult: 'downloaded' | 'shared' | 'opened'; clipboardCopied: boolean }> {
  // Generate the PNG blob once — reused for both download & clipboard
  const blob = await canvasToBlob(canvas, 'image/png');

  // Run download and clipboard copy in parallel
  const [downloadSettled, clipboardSettled] = await Promise.allSettled([
    (async () => {
      // Re-implement download logic using the pre-made blob
      if (isMobileDevice()) {
        const shared = await shareImage(blob, fileName);
        if (shared) return 'shared' as const;
        if (isIOSSafari()) { openImageForSave(blob); return 'opened' as const; }
        downloadViaAnchor(blob, fileName);
        return 'downloaded' as const;
      }
      downloadViaAnchor(blob, fileName);
      return 'downloaded' as const;
    })(),
    copyImageToClipboard(blob),
  ]);

  const downloadResult = downloadSettled.status === 'fulfilled'
    ? downloadSettled.value
    : 'downloaded';
  const clipboardCopied = clipboardSettled.status === 'fulfilled'
    ? clipboardSettled.value
    : false;

  return { downloadResult, clipboardCopied };
}
