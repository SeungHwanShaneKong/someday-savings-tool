// [CL-ADMIN-VISITOR-20260709-231827] 7일 이동평균(SMA) 순수 모듈 — 차트 오버레이용.
//   계약: 결과 길이 = 입력 길이. 앞 window-1개는 null(가짜 0 금지 — Recharts 가 null 을 그리지 않아
//   축 왜곡 없이 선이 window번째 지점부터 시작). 윈도 내 null/undefined 가 하나라도 있으면 해당
//   인덱스도 null(결측 전파 — 불완전 평균으로 오도 금지). 입력 배열은 불변. 반올림은 툴팁 formatter 책임.

/**
 * 단순 이동평균(SMA).
 * @param values 시계열 값(과거→최신). null/undefined = 결측.
 * @param window 윈도 크기(≥1). 1 미만이면 throw.
 * @returns 입력과 동일 길이. [0..window-2]=null, 이후는 직전 window개 평균(결측 포함 시 null).
 */
export function sma(
  values: ReadonlyArray<number | null | undefined>,
  window: number,
): Array<number | null> {
  if (!Number.isInteger(window) || window < 1) {
    throw new Error(`sma: window 는 1 이상의 정수여야 합니다 (받은 값: ${window})`);
  }
  const out: Array<number | null> = new Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i++) {
    let sum = 0;
    let valid = true;
    for (let j = i - window + 1; j <= i; j++) {
      const v = values[j];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        valid = false; // 결측/비정상 값 → 해당 인덱스 결측 전파
        break;
      }
      sum += v;
    }
    out[i] = valid ? sum / window : null;
  }
  return out;
}

/**
 * data[key] 시리즈의 이동평균을 outKey 로 주입한 새 배열 반환(입력·원소 불변).
 * key 값이 숫자가 아니면(null/undefined 포함) 결측으로 취급한다.
 */
export function withMovingAverage<T extends object, K extends string>(
  data: ReadonlyArray<T>,
  key: keyof T,
  window: number,
  outKey: K,
): Array<T & Record<K, number | null>> {
  const series = data.map((d) => {
    const v = d[key];
    return typeof v === 'number' ? v : null;
  });
  const ma = sma(series, window);
  return data.map((d, i) => ({ ...d, [outKey]: ma[i] }) as T & Record<K, number | null>);
}
