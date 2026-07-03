// [CL-TOP20-P3-INPUT-20260703-030000] 스마트 금액 파서 — "500만"·"1.2억"·"5000000" 인식.
// 기존 parseKoreanWon(budget-categories)의 억/만 해석 규칙을 재사용·확장한 순수 함수 모듈.
// 확장점: ① 소수점 지원("1.2억" — parseKoreanWon 은 parseInt 로 1억이 됨) ② ₩ 기호 허용
// ③ 비정상 토큰은 null 로 정직 반환(0 으로 위장하지 않음 → 힌트 표시/커밋 판단 분리 가능).

/** 허용 문자만 남긴다(₩·콤마·공백·'원' 등 제거, 숫자·소수점·억·만 유지) */
export function sanitizeWonText(raw: string): string {
  return raw.replace(/[^0-9.억만]/g, '');
}

const NUM = /^\d+(?:\.\d+)?$/;

/** 숫자 토큰 × 단위 → 원 단위 정수(부동소수 오차는 반올림 흡수). 비정상 토큰은 null */
const toWon = (part: string, unit: number): number | null =>
  NUM.test(part) ? Math.round(parseFloat(part) * unit) : null;

/**
 * "500만" | "1.2억" | "1억2000만" | "1억2000만3000" | "₩5,000,000원" | "5000000" → 원 단위 정수.
 * 해석 불가(빈 문자열·"만" 단독·이중 소수점·억 중복 등)는 null.
 */
export function parseSmartWon(raw: string): number | null {
  const cleaned = sanitizeWonText(raw);
  if (!cleaned) return null;

  const eokIdx = cleaned.indexOf('억');
  if (eokIdx >= 0) {
    const eok = toWon(cleaned.slice(0, eokIdx), 100_000_000);
    if (eok === null) return null;
    const rest = cleaned.slice(eokIdx + 1);
    if (!rest) return eok;
    if (rest.includes('억')) return null; // "1억2억" 같은 억 중복 거부
    const sub = parseSmartWon(rest); // "2000만" | "2000만3000" | "3000"
    return sub === null ? null : eok + sub;
  }

  const manIdx = cleaned.indexOf('만');
  if (manIdx >= 0) {
    const man = toWon(cleaned.slice(0, manIdx), 10_000);
    if (man === null) return null;
    const tail = cleaned.slice(manIdx + 1);
    if (!tail) return man;
    const won = toWon(tail, 1); // "500만3000" → 5,003,000 ("만" 중복은 NUM 불일치로 null)
    return won === null ? null : man + won;
  }

  return toWon(cleaned, 1);
}
