// [ZERO-COST-PIPELINE-2026-03-07] PII (개인식별정보) 마스킹 유틸리티
// 크롤링된 텍스트에서 전화번호, 이메일, 주민번호 등을 마스킹

/**
 * 한국 전화번호 패턴
 * 010-1234-5678, 02-1234-5678, 031-123-4567, 010.1234.5678, 01012345678
 */
const PHONE_PATTERNS = [
  // 010-1234-5678 / 010.1234.5678 / 010 1234 5678
  /\b(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})\b/g,
  // 02-1234-5678 (서울)
  /\b(02)[-.\s]?(\d{3,4})[-.\s]?(\d{4})\b/g,
  // 031-123-4567 (지역번호)
  /\b(0[3-6][1-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})\b/g,
  // 070-1234-5678 (인터넷전화)
  /\b(070)[-.\s]?(\d{3,4})[-.\s]?(\d{4})\b/g,
  // 1588-1234, 1600-1234 (대표번호)
  /\b(1[56]\d{2})[-.\s]?(\d{4})\b/g,
];

/**
 * 이메일 패턴
 */
const EMAIL_PATTERN = /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;

/**
 * 주민등록번호 패턴 (YYMMDD-NNNNNNN)
 */
const RRN_PATTERN = /\b(\d{6})[-.\s]?([1-4]\d{6})\b/g;

/**
 * 카드번호 패턴 (XXXX-XXXX-XXXX-XXXX)
 */
const CARD_PATTERN = /\b(\d{4})[-.\s]?(\d{4})[-.\s]?(\d{4})[-.\s]?(\d{4})\b/g;

/**
 * 크롤링된 텍스트에서 PII를 마스킹합니다.
 *
 * @param text 원본 텍스트
 * @returns PII가 마스킹된 텍스트
 *
 * @example
 * maskPII("연락처: 010-1234-5678") → "연락처: 010-****-****"
 * maskPII("email: user@domain.com") → "email: u***@d***.com"
 * maskPII("주민번호: 900101-1234567") → "주민번호: 900101-*******"
 */
export function maskPII(text: string): string {
  let masked = text;

  // 주민등록번호 마스킹 (가장 먼저 — 다른 패턴과 겹칠 수 있으므로)
  masked = masked.replace(RRN_PATTERN, '$1-*******');

  // 카드번호 마스킹
  masked = masked.replace(CARD_PATTERN, '$1-****-****-$4');

  // 전화번호 마스킹
  for (const pattern of PHONE_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.source.includes('1[56]')) {
      // 대표번호: 1588-****
      masked = masked.replace(pattern, '$1-****');
    } else {
      // 일반 전화번호: 010-****-****
      masked = masked.replace(pattern, '$1-****-****');
    }
  }

  // 이메일 마스킹
  masked = masked.replace(EMAIL_PATTERN, (_match, local: string, domain: string) => {
    const maskedLocal = local.charAt(0) + '***';
    const domainParts = domain.split('.');
    const maskedDomain =
      domainParts[0].charAt(0) + '***.' + domainParts.slice(1).join('.');
    return `${maskedLocal}@${maskedDomain}`;
  });

  return masked;
}

/**
 * PII 감지 여부만 확인 (마스킹 없이)
 */
export function containsPII(text: string): boolean {
  const patterns = [
    ...PHONE_PATTERNS,
    EMAIL_PATTERN,
    RRN_PATTERN,
    CARD_PATTERN,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return true;
  }

  return false;
}
