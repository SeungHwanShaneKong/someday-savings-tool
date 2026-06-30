// [CL-AUDIT2-R5-PERF-20260628] 리텐션 계산 순수 모듈(추출 + O(P×V)→O(P+V) 최적화).
//
// 배경(F6): 기존 inline computeRetention 은 for(profiles){ pageViews.some(... new Date(pv.created_at) ...) } 의
//   O(P×V) 중첩 스캔이고 비교마다 new Date()를 2회 생성 → d1/d7/d30 3회 호출로 20초 폴링마다 메인스레드 블로킹.
// 최적화: pageViews 를 1회 순회해 user_id→ms[] 인덱스로 만들고(파싱 1회), 프로필별로 자기 방문 ms 만 스캔.
//   결과(반올림 전 백분율)는 기존과 '비트 동일'(같은 startOfDay/endOfDay 경계·동일 inclusive 비교). 골든 테스트로 고정.

import { startOfDay, endOfDay } from 'date-fns';
import { ok, noData, type Measure } from './kpi-measure';

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

// [CL-FACT-RETENTION-20260630] 정직 리텐션(개선1 A4) — 분모를 '관측 가능한 코호트'로 한정.
//
// 결함(기존): 분모가 전체(기간 내) 가입자라, 아직 Dx 기념일이 도래하지 않은(=재방문 여부를 알 수 없는) 가입자까지
//   분모에 포함돼 리텐션을 구조적으로 deflate(거짓으로 낮게)했다. 예: 어제 가입자는 D7 재방문이 불가능한데 D7 분모에 들어감.
// 교정: Dx 기념일 윈도우의 끝(targetEnd)이 관측 종료일(observableEnd=endDate) 이내인 가입자만 분모(eligible)로 센다.
//   eligible 0(기간이 너무 짧아 측정 불가) → noData('데이터 없음'). 그 외 ok(%)+coverage{관측 n / 모수 m}.
//   결과 % 는 기존 동일 일경계·inclusive 비교(분모만 정직화). 가짜 0/deflate 금지.
export function computeRetentionMeasure(
  profiles: RetentionProfile[],
  pageViews: RetentionVisit[],
  daysAfter: number,
  observableEnd: Date,
): Measure {
  const obsMs = observableEnd.getTime();

  const byUser = new Map<string, number[]>();
  for (const pv of pageViews) {
    if (!pv.user_id) continue;
    const ms = new Date(pv.created_at).getTime();
    const arr = byUser.get(pv.user_id);
    if (arr) arr.push(ms);
    else byUser.set(pv.user_id, [ms]);
  }

  let eligible = 0;
  let returned = 0;
  for (const p of profiles) {
    const signupMs = new Date(p.created_at).getTime();
    const targetStart = startOfDay(new Date(signupMs + daysAfter * 86400000)).getTime();
    const targetEnd = endOfDay(new Date(targetStart)).getTime();
    if (targetEnd > obsMs) continue; // Dx 기념일 미도래 → 관측 불가(분모 제외)
    eligible++;
    const visits = byUser.get(p.user_id);
    if (visits && visits.some((ms) => ms >= targetStart && ms <= targetEnd)) returned++;
  }

  if (eligible === 0) return noData('관측 가능한 코호트 없음(기간이 너무 짧음)');
  return ok(Math.round((returned / eligible) * 1000) / 10, { n: returned, m: eligible });
}
