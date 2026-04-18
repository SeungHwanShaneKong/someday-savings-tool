/**
 * [CL-GAMIFY-INT-20260418-222329] Streak 계산 순수 함수
 * - 날짜 넘김/timezone-safe: 모든 계산은 KST(Asia/Seoul) 기준
 * - 연속일 계산 + freeze token 소비 로직
 */

/** YYYY-MM-DD 형식으로 KST 기준 날짜 문자열 */
export function toKSTDateString(date: Date = new Date()): string {
  // KST = UTC + 9
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().slice(0, 10);
}

/** 두 YYYY-MM-DD 문자열 사이의 일수 차이 (양수 = b가 더 최근) */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

/** 오늘(KST) 기준 yesterday YYYY-MM-DD */
export function yesterdayKST(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return toKSTDateString(yesterday);
}

/**
 * 활동 날짜 목록(YYYY-MM-DD, 정렬 無)으로부터 현재 streak 일수를 계산
 *
 * 규칙:
 * - 오늘 활동했으면 streak에 포함 (기본)
 * - 오늘 활동 안 했어도 어제 활동했으면 streak 유지 (당일 0시~24시 grace)
 * - 어제·오늘 둘 다 안 했으면 streak = 0
 *
 * @param dates 활동 날짜 배열 (중복 OK, KST YYYY-MM-DD)
 * @param today 기준 날짜 (기본 오늘 KST)
 * @returns 연속 활동 일수
 */
export function computeStreak(
  dates: ReadonlyArray<string>,
  today: string = toKSTDateString(),
): number {
  if (dates.length === 0) return 0;

  // [CL-GAMIFY-QA50-20260418-224158] 미래 날짜 필터 — timezone 오차로 인한 ahead-of-today는 제외
  // 중복 제거 + 내림차순 정렬
  const uniq = Array.from(new Set(dates))
    .filter((d) => daysBetween(d, today) >= 0) // today 포함 과거만
    .sort()
    .reverse();
  if (uniq.length === 0) return 0;

  // 가장 최근 활동이 어제보다 오래되었으면 streak 끊김
  const mostRecent = uniq[0];
  const diffFromToday = daysBetween(mostRecent, today);
  if (diffFromToday > 1) return 0;

  // 연속성 확인: 시작점(가장 최근 활동일)부터 하루씩 거슬러
  let streak = 1;
  let expected = mostRecent;
  for (let i = 1; i < uniq.length; i++) {
    const expectedPrev = shiftDate(expected, -1);
    if (uniq[i] === expectedPrev) {
      streak += 1;
      expected = expectedPrev;
    } else {
      break;
    }
  }
  return streak;
}

/** YYYY-MM-DD 문자열에 days를 더한 결과 (음수 가능) */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 오늘이 streak의 연속일인지 판별 (UI 배너에서 "오늘 로그인!" 표시 여부) */
export function isStreakActiveToday(
  dates: ReadonlyArray<string>,
  today: string = toKSTDateString(),
): boolean {
  return dates.includes(today);
}

/**
 * Freeze token으로 끊길 streak을 살릴 수 있는지 판단
 * - 어제 활동 없음 + 오늘 활동 없음 + 그제까지는 streak이 있었음 → 토큰 소비 가능
 */
export function canUseFreezeToken(
  dates: ReadonlyArray<string>,
  freezeTokens: number,
  today: string = toKSTDateString(),
): boolean {
  if (freezeTokens <= 0) return false;
  if (dates.length === 0) return false;
  const yesterday = shiftDate(today, -1);
  const dayBeforeYesterday = shiftDate(today, -2);
  // 어제·오늘 활동 없고 그제 활동 있어야 함
  return (
    !dates.includes(today) &&
    !dates.includes(yesterday) &&
    dates.includes(dayBeforeYesterday)
  );
}

/** 마일스톤 트로피 임계값 (일수) */
export const STREAK_MILESTONES = [7, 14, 30, 100, 365] as const;

/** 현재 streak에서 도달한 가장 높은 마일스톤 (없으면 0) */
export function currentMilestone(streakDays: number): number {
  return (
    [...STREAK_MILESTONES].reverse().find((m) => streakDays >= m) ?? 0
  );
}

/** 다음 마일스톤까지 남은 일수 (없으면 null = 365 이상) */
export function daysToNextMilestone(streakDays: number): number | null {
  const next = STREAK_MILESTONES.find((m) => streakDays < m);
  return next ? next - streakDays : null;
}
