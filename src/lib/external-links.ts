// [CL-HONEYMOON-EXTERNAL-20260416-221500] 외부 서비스 URL 중앙 관리
export const EXTERNAL_URLS = {
  honeymoon: 'https://honeymoon.moderninsightspot.com',
} as const;

/** 허니문 큐레이션 외부 사이트로 같은 탭에서 이동 [CL-HONEYMOON-SAMETAB-20260416-224500] */
export function openHoneymoon() {
  window.location.href = EXTERNAL_URLS.honeymoon;
}
