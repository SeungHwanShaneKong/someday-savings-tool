// [CL-ADMIN-KST-20260709-000939] 관리자 지표 순수 집계 프리미티브 — KST 달력일 기반·TZ 무관·골든 테스트 가능.
//   기존 useAdminKPI 인라인 집계가 Date.toDateString()(브라우저 로컬 달력일)로 "고유 방문일"을 세어
//   비-KST 조회 시 DAU/충성 사용자가 어긋났다. 여기서 KST 달력일(kstDayKey)로 통일해 결정론 보증.
import { kstDayKey } from '@/lib/admin/kst-time';

interface UserRow {
  user_id?: string | null;
}

/** admin/스태프 user_id 제외(실사용자 수치 혼입 방지). 소유자 기준 행에 공통 적용. */
export function excludeAdmins<T extends UserRow>(rows: T[], adminUserIds: Set<string>): T[] {
  if (adminUserIds.size === 0) return rows;
  return rows.filter((r) => !r.user_id || !adminUserIds.has(r.user_id));
}

/** 고유 활성 사용자 수(비-null user_id distinct) — DAU/WAU/MAU·totalUnique. */
export function uniqueUserCount(rows: UserRow[]): number {
  const set = new Set<string>();
  for (const r of rows) if (r.user_id) set.add(r.user_id);
  return set.size;
}

interface DatedUserRow extends UserRow {
  created_at: string;
}

/** user_id → 방문한 KST 달력일 집합 (충성/재방문 판정용). created_at 파싱불가 행은 안전 제외. */
export function distinctKstDaysByUser(rows: DatedUserRow[]): Map<string, Set<string>> {
  const byUser = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.user_id) continue;
    const t = Date.parse(r.created_at);
    if (Number.isNaN(t)) continue; // 파싱불가 → 오집계 대신 제외
    const key = kstDayKey(new Date(t));
    let set = byUser.get(r.user_id);
    if (!set) {
      set = new Set();
      byUser.set(r.user_id, set);
    }
    set.add(key);
  }
  return byUser;
}

/** 충성 사용자 수 = 서로 다른 KST 달력일에 2회 이상 방문한 고유 사용자 수. */
export function loyalUserCount(rows: DatedUserRow[]): number {
  let n = 0;
  for (const days of distinctKstDaysByUser(rows).values()) if (days.size >= 2) n += 1;
  return n;
}

/** 평균 체류(초) — duration_seconds>0 만, 정수 반올림. 값 없으면 0. */
export function avgPositiveDuration(rows: { duration_seconds?: number | null }[]): number {
  const ds = rows.map((r) => r.duration_seconds || 0).filter((d) => d > 0);
  if (ds.length === 0) return 0;
  return Math.round(ds.reduce((a, b) => a + b, 0) / ds.length);
}
