/** [CL-QA100-BTN-20260531] lib 버튼-로직 단위 검증 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadImage } from '../download-image';

// jsdom does not provide URL.createObjectURL / revokeObjectURL — define stubs
if (!URL.createObjectURL) {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: (_blob: Blob) => 'blob:stub',
  });
}
if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: (_url: string) => {},
  });
}

// Helper: set navigator.userAgent
function setUA(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
    writable: true,
  });
}

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1 Mobile/21A329 Safari/604.1';

/** Create a minimal mock canvas whose toBlob resolves to a real Blob */
function makeCanvas(succeed = true): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const mockBlob = new Blob(['fake-png-data'], { type: 'image/png' });
  vi.spyOn(canvas, 'toBlob').mockImplementation((cb) => {
    cb(succeed ? mockBlob : null);
  });
  return canvas;
}

/** Silence the 1500ms debounce reset timer between tests */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset the module-level `isProcessing` flag by fast-forwarding timers BEFORE restoring real timers
  vi.runAllTimers();
  vi.useRealTimers();
  setUA(DESKTOP_UA);
});

// ─── DL.1–DL.3: Desktop download ───

describe('DL: downloadImage() — Desktop', () => {
  it('DL.1 desktop UA → creates anchor with download attr and returns "downloaded"', async () => {
    setUA(DESKTOP_UA);
    // Stub clipboard-related API not present in jsdom
    Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true });

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    const createObjURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    // Stub click on anchor
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const canvas = makeCanvas();
    const promise = downloadImage(canvas, 'test.png');
    const result = await promise;

    expect(result).toBe('downloaded');
    expect(createObjURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled(); // removal is deferred in setTimeout

    vi.runAllTimers();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('DL.2 canvas toBlob failure → rejects with error', async () => {
    setUA(DESKTOP_UA);
    const canvas = makeCanvas(false); // null blob
    await expect(downloadImage(canvas, 'fail.png')).rejects.toThrow('Canvas toBlob failed');
    vi.runAllTimers();
  });

  it('DL.3 concurrent call during processing → throws debounce error', async () => {
    setUA(DESKTOP_UA);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const canvas = makeCanvas();
    const first = downloadImage(canvas, 'first.png');
    // Second call while first is in-flight
    await expect(downloadImage(makeCanvas(), 'second.png')).rejects.toThrow('진행 중');
    await first;
    vi.runAllTimers();
  });
});

// ─── DL.4–DL.5: Android mobile download ───

describe('DL: downloadImage() — Android', () => {
  it('DL.4 Android without Share API → returns "downloaded"', async () => {
    setUA(ANDROID_UA);
    Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(window.navigator, 'canShare', { value: undefined, configurable: true });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:android');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = await downloadImage(makeCanvas(), 'android.png');
    expect(result).toBe('downloaded');
    vi.runAllTimers();
  });

  it('DL.5 Android with Share API + canShare → returns "shared"', async () => {
    setUA(ANDROID_UA);
    const mockBlob = new Blob(['png'], { type: 'image/png' });
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'share', { value: shareFn, configurable: true, writable: true });
    Object.defineProperty(window.navigator, 'canShare', { value: vi.fn().mockReturnValue(true), configurable: true, writable: true });

    const canvas = makeCanvas();
    // Override toBlob to return the exact blob we created
    vi.spyOn(canvas, 'toBlob').mockImplementation((cb) => { cb(mockBlob); });

    const result = await downloadImage(canvas, 'share.png');
    expect(result).toBe('shared');
    expect(shareFn).toHaveBeenCalled();
    vi.runAllTimers();
  });
});

// ─── DL.6: iOS fallback ───

describe('DL: downloadImage() — iOS', () => {
  it('DL.6 iOS without Share API → returns "opened" (new tab fallback)', async () => {
    setUA(IOS_UA);
    Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(window.navigator, 'canShare', { value: undefined, configurable: true });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ios');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockReturnValue(null);

    const result = await downloadImage(makeCanvas(), 'ios.png');
    expect(result).toBe('opened');
    vi.runAllTimers();
  });
});
