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

// [CL-ADMIN-VISITOR-20260709-231827] 일별 접속자(익명 세션 + 로그인 사용자) 병합 — '일별 접속자 (추정)' 카드용.
//   모집단 상호배타 근거: usePageTracking 이 page_views(로그인)와 track-visit(익명, user 있으면 return)를
//   분기하므로 같은 인스턴트에 이중 기록 없음(같은 날 로그인 전 방문은 익명 1회 포함 가능 — 카드 각주로 고지).
//   조인 키 = 'M/d' KST 라벨(양쪽 소스 모두 KST 달력일에서 파생) → TZ 불변성은 라벨 생성부(kst-time 골든)가 보증.
export interface VisitorTrendPoint {
  date: string;
  /** 익명 방문 세션 수(anon_page_views RPC, sparse day 는 0 필) */
  anonSessions: number;
  /** 로그인 활성 사용자 수(DAU) */
  loginUsers: number;
  /** 총 접속자(추정) = anonSessions + loginUsers */
  total: number;
  /** 로그인 비율 %(0~100). total=0 이면 null(0% 오도 금지) */
  loginRatio: number | null;
}

/**
 * trend(dense, 일별 프레임)를 기준으로 순회하며 anon(sparse)을 'M/d' 라벨로 조인.
 * anon 에만 존재하는 날(트렌드 프레임 밖)은 무시 — 결과 길이 = trend 길이.
 */
export function mergeVisitorTrend(
  trend: ReadonlyArray<{ date: string; dau?: number }>,
  anon: ReadonlyArray<{ day: string; sessions: number }>,
): VisitorTrendPoint[] {
  const anonByDay = new Map<string, number>();
  for (const a of anon) anonByDay.set(a.day, (anonByDay.get(a.day) ?? 0) + (a.sessions || 0));
  return trend.map((t) => {
    const anonSessions = anonByDay.get(t.date) ?? 0;
    const loginUsers = t.dau ?? 0;
    const total = anonSessions + loginUsers;
    return {
      date: t.date,
      anonSessions,
      loginUsers,
      total,
      loginRatio: total > 0 ? (loginUsers / total) * 100 : null,
    };
  });
}
