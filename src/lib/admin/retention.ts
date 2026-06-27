// [CL-AUDIT2-R5-PERF-20260628] 리텐션 계산 순수 모듈(추출 + O(P×V)→O(P+V) 최적화).
//
// 배경(F6): 기존 inline computeRetention 은 for(profiles){ pageViews.some(... new Date(pv.created_at) ...) } 의
//   O(P×V) 중첩 스캔이고 비교마다 new Date()를 2회 생성 → d1/d7/d30 3회 호출로 20초 폴링마다 메인스레드 블로킹.
// 최적화: pageViews 를 1회 순회해 user_id→ms[] 인덱스로 만들고(파싱 1회), 프로필별로 자기 방문 ms 만 스캔.
//   결과(반올림 전 백분율)는 기존과 '비트 동일'(같은 startOfDay/endOfDay 경계·동일 inclusive 비교). 골든 테스트로 고정.

import { startOfDay, endOfDay } from 'date-fns';

export interface RetentionProfile {
  user_id: string;
  created_at: string;
}
export interface RetentionVisit {
  user_id: string | null;
  created_at: string;
}

/**
 * 가입 후 daysAfter 일째(로컬 일경계) 재방문 비율(%). profiles 0건이면 0.
 * 동치 보장: targetStart=startOfDay(signup + daysAfter일), targetEnd=endOfDay(targetStart), inclusive 비교.
 */
export function computeRetentionRate(
  profiles: RetentionProfile[],
  pageViews: RetentionVisit[],
  daysAfter: number,
): number {
  if (profiles.length === 0) return 0;

  // user_id → 방문 ms 목록 (created_at 파싱 1회)
  const byUser = new Map<string, number[]>();
  for (const pv of pageViews) {
    if (!pv.user_id) continue;
    const ms = new Date(pv.created_at).getTime();
    const arr = byUser.get(pv.user_id);
    if (arr) arr.push(ms);
    else byUser.set(pv.user_id, [ms]);
  }

  let returned = 0;
  for (const p of profiles) {
    const signupMs = new Date(p.created_at).getTime();
    const targetStart = startOfDay(new Date(signupMs + daysAfter * 86400000)).getTime();
    const targetEnd = endOfDay(new Date(targetStart)).getTime();
    const visits = byUser.get(p.user_id);
    if (visits && visits.some((ms) => ms >= targetStart && ms <= targetEnd)) returned++;
  }
  return (returned / profiles.length) * 100;
}
