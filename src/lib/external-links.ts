// [CL-HONEYMOON-EXTERNAL-20260416-221500] 외부 서비스 URL 중앙 관리
export const EXTERNAL_URLS = {
  honeymoon: 'https://honeymoon.moderninsightspot.com',
} as const;

/** 허니문 큐레이션 외부 사이트를 새 탭으로 열기 */
export function openHoneymoon() {
  window.open(EXTERNAL_URLS.honeymoon, '_blank', 'noopener,noreferrer');
}
