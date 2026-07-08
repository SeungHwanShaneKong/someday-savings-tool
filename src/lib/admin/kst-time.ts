// [CL-ADMIN-KST-20260709-000939] 관리자 지표용 KST(Asia/Seoul, UTC+9) 달력일 경계 — 순수·런타임 TZ 무관.
//   문제: 기존 집계가 date-fns startOfDay/endOfDay/subDays 와 Date.toDateString() 을 써서 "일간" 경계가
//         브라우저 로컬 TZ 에 종속됐다(비-KST 조회 시 날짜 ±1 어긋남, 서버 익명 RPC=Asia/Seoul 와 불일치).
//   해결: 절대시각(getTime, UTC ms)만으로 KST 달력일 경계를 계산 → 어느 TZ 에서 실행해도 동일한 KST 결과.
import { toKSTDateString } from '@/lib/gamification/streak-calc';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9
const DAY_MS = 24 * 60 * 60 * 1000;

/** d 가 속한 KST 달력일의 시작(KST 00:00)에 해당하는 실제 UTC 인스턴트 */
export function startOfKstDayUtc(d: Date): Date {
  const shifted = d.getTime() + KST_OFFSET_MS; // KST 벽시계로 이동
  const kstMidnightShifted = Math.floor(shifted / DAY_MS) * DAY_MS; // 그 날의 KST 자정(shifted 축)
  return new Date(kstMidnightShifted - KST_OFFSET_MS); // 실제 UTC 인스턴트로 환원
}

/** d 가 속한 KST 달력일의 끝(KST 23:59:59.999)에 해당하는 실제 UTC 인스턴트(포함 상한) */
export function endOfKstDayUtc(d: Date): Date {
  return new Date(startOfKstDayUtc(d).getTime() + DAY_MS - 1);
}

/** 절대시각 n일 차감(24h*n) — 롤링 윈도우용(KST 경계 유지) */
export function subKstDays(d: Date, n: number): Date {
  return new Date(d.getTime() - n * DAY_MS);
}

/** KST 달력일 키 'YYYY-MM-DD'(고유 일자 dedup·버킷 키). streak-calc 헬퍼 재사용. */
export function kstDayKey(d: Date): string {
  return toKSTDateString(d);
}

/** 'M/d' KST 라벨(차트 축용) */
export function kstMonthDayLabel(d: Date): string {
  const key = toKSTDateString(d); // YYYY-MM-DD
  const [, m, day] = key.split('-');
  return `${Number(m)}/${Number(day)}`;
}

export const startOfKstDayUtcISO = (d: Date): string => startOfKstDayUtc(d).toISOString();
export const endOfKstDayUtcISO = (d: Date): string => endOfKstDayUtc(d).toISOString();
