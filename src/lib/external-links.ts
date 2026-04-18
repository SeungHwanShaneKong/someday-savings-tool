// [CL-HONEYMOON-EXTERNAL-20260416-221500] 외부 서비스 URL 중앙 관리
// [CL-SEC-HARDEN-20260418-214623] Open Redirect 방어 — origin allowlist + HTTPS-only 런타임 검증

/**
 * 외부 서비스 URL — openExternalLink를 통해 이동 가능한 허용 목록
 * 여기에 등록된 origin만 런타임 검증을 통과합니다.
 */
export const EXTERNAL_URLS = {
  honeymoon: 'https://honeymoon.moderninsightspot.com',
  gift: 'https://gift.moderninsightspot.com', // [CL-GIFT-CARD-20260418-240000]
} as const;

/** 허용된 외부 URL의 정확한 리터럴 타입 */
export type AllowedExternalUrl = (typeof EXTERNAL_URLS)[keyof typeof EXTERNAL_URLS];

/**
 * 런타임 허용 origin 집합
 * EXTERNAL_URLS의 값들을 URL로 파싱하여 origin만 추출
 * 모듈 초기화 시 1회 계산 → 호출마다 재계산 비용 없음
 */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  Object.values(EXTERNAL_URLS).map((url) => new URL(url).origin),
);

/**
 * URL 검증 — 다음 조건을 모두 만족해야 통과
 * 1) URL 생성자가 파싱 가능 (형식 검증)
 * 2) 프로토콜이 `https:`
 * 3) origin이 ALLOWED_ORIGINS에 포함
 *
 * 실패 시 구체적 사유와 함께 Error를 throw
 * [CL-SEC-HARDEN-20260418-214623]
 */
function assertAllowedExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[openExternalLink] Malformed URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(
      `[openExternalLink] Only HTTPS protocol allowed. Got: ${parsed.protocol}`,
    );
  }
  if (!ALLOWED_ORIGINS.has(parsed.origin)) {
    throw new Error(
      `[openExternalLink] Disallowed origin: ${parsed.origin}. ` +
        `Allowed: ${Array.from(ALLOWED_ORIGINS).join(', ')}`,
    );
  }
}

/**
 * 허니문 큐레이션 외부 사이트로 같은 탭에서 이동
 * [CL-HONEYMOON-SAMETAB-20260416-224500]
 */
export function openHoneymoon(): void {
  openExternalLink(EXTERNAL_URLS.honeymoon);
}

/**
 * 외부 사이트로 같은 탭에서 이동 — 반드시 EXTERNAL_URLS에 등록된 URL만 허용
 * [CL-GIFT-CARD-20260418-240000] + [CL-SEC-HARDEN-20260418-214623]
 *
 * @param url 허용 origin 집합에 포함된 HTTPS URL
 * @throws {Error} 프로토콜/origin/형식 검증 실패 시
 */
export function openExternalLink(url: string): void {
  assertAllowedExternalUrl(url);
  window.location.href = url;
}

/**
 * 테스트 용도: URL이 허용되는지만 검증 (navigation 없음)
 * 프로덕션 코드에서도 사전 검증 후 분기 처리에 활용 가능
 * [CL-SEC-HARDEN-20260418-214623]
 */
export function isAllowedExternalUrl(url: string): boolean {
  try {
    assertAllowedExternalUrl(url);
    return true;
  } catch {
    return false;
  }
}
