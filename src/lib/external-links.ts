// [CL-HONEYMOON-EXTERNAL-20260416-221500] 외부 서비스 URL 중앙 관리
export const EXTERNAL_URLS = {
  honeymoon: 'https://honeymoon.moderninsightspot.com',
  gift: 'https://gift.moderninsightspot.com', // [CL-GIFT-CARD-20260418-240000]
} as const;

/** 허니문 큐레이션 외부 사이트로 같은 탭에서 이동 [CL-HONEYMOON-SAMETAB-20260416-224500] */
export function openHoneymoon() {
  window.location.href = EXTERNAL_URLS.honeymoon;
}

/** 선물 추천 AI 외부 사이트로 같은 탭에서 이동 [CL-GIFT-CARD-20260418-240000] */
export function openExternalLink(url: string) {
  window.location.href = url;
}
