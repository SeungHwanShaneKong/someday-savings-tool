// [CL-ADMIN-KST-20260709-000939] 골든: 관리자 지표 정확성 보증 — KST 경계·TZ 불변·admin 제외·합성 제외 계약.
//   "전 지표가 과다·과소 없이 정확"함을 결정론적 고정입력→기대정수로 기계 증명(성장하는 1급 오라클).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  uniqueUserCount,
  loyalUserCount,
  excludeAdmins,
  distinctKstDaysByUser,
  avgPositiveDuration,
} from '../../src/lib/admin/trend-compute';
import { startOfKstDayUtc, subKstDays } from '../../src/lib/admin/kst-time';
import { firstTrendBucketStart } from '../../src/lib/kpi-definitions';

const ROOT = process.cwd();

// KST 경계를 넘나드는 고정 방문 로그(UTC 인스턴트 명시). 15:00:00Z = KST 익일 00:00.
// u1: 7/8 KST 2회(같은 날) → 고유일 1 · u2: 7/8·7/9 KST 각 1회 → 고유일 2(충성) · u3: 7/9 KST 1회 → 고유일 1
const PV = [
  { user_id: 'u1', created_at: '2026-07-08T01:00:00Z' }, // KST 7/8 10:00
  { user_id: 'u1', created_at: '2026-07-08T02:00:00Z' }, // KST 7/8 11:00 (같은 KST일)
  { user_id: 'u2', created_at: '2026-07-08T14:59:59Z' }, // KST 7/8 23:59:59 (경계 직전)
  { user_id: 'u2', created_at: '2026-07-08T15:00:00Z' }, // KST 7/9 00:00 (경계 → 다른 KST일)
  { user_id: 'u3', created_at: '2026-07-09T05:00:00Z' }, // KST 7/9 14:00
  { user_id: null, created_at: '2026-07-09T05:00:00Z' }, // 익명(user_id null) → 고유/충성 제외
];

describe('golden: 관리자 지표 — 고유/충성(KST 달력일)', () => {
  it('고유 사용자 수 = 3 (u1,u2,u3; null 제외)', () => {
    expect(uniqueUserCount(PV)).toBe(3);
  });

  it('충성 사용자 수 = 1 (u2만 서로 다른 KST일 2회; u1은 같은 KST일 2회라 1일)', () => {
    // 경계(14:59:59Z=7/8, 15:00:00Z=7/9)가 올바른 KST일로 분리돼야 u2가 충성으로 잡힌다.
    expect(loyalUserCount(PV)).toBe(1);
  });

  it('u1은 같은 KST 달력일 2회 → 고유일 1(충성 아님)', () => {
    const m = distinctKstDaysByUser(PV);
    expect(m.get('u1')?.size).toBe(1);
    expect(m.get('u2')?.size).toBe(2);
    expect(m.get('u3')?.size).toBe(1);
  });

  it('TZ 불변: 프로세스 TZ와 무관하게 동일(절대시각 기반 — 회귀가드)', () => {
    // 결과가 로컬 TZ에 의존하면 이 값들이 흔들린다. getTime/KST 고정이라 항상 동일.
    expect(uniqueUserCount(PV)).toBe(3);
    expect(loyalUserCount(PV)).toBe(1);
  });

  it('created_at 파싱불가 행은 안전 제외(오집계 금지)', () => {
    const bad = [...PV, { user_id: 'u9', created_at: 'not-a-date' }];
    expect(distinctKstDaysByUser(bad).get('u9')).toBeUndefined();
    expect(uniqueUserCount(bad)).toBe(4); // u9는 고유엔 잡히나(있는 user_id) 충성 일자엔 미포함
    expect(loyalUserCount(bad)).toBe(1);
  });

  it('avgPositiveDuration: 0/음수 제외·정수 반올림', () => {
    expect(avgPositiveDuration([{ duration_seconds: 10 }, { duration_seconds: 0 }, { duration_seconds: 21 }])).toBe(16);
    expect(avgPositiveDuration([{ duration_seconds: 0 }, { duration_seconds: null }])).toBe(0);
  });
});

describe('golden: admin/스태프 제외', () => {
  it('admin user_id 행은 집계에서 제외(과다 방지)', () => {
    const admins = new Set(['u2']);
    const filtered = excludeAdmins(PV, admins);
    expect(uniqueUserCount(filtered)).toBe(2); // u1,u3 (u2 제외; null은 남지만 고유 미집계)
    expect(loyalUserCount(filtered)).toBe(0); // 충성이던 u2 제외
  });

  it('admin 집합이 비면 원본 유지(폴백 안전)', () => {
    expect(excludeAdmins(PV, new Set()).length).toBe(PV.length);
  });
});

describe('golden: 합성데이터 제외 계약(회귀가드)', () => {
  it('익명 RPC 시그니처는 p_include_synthetic DEFAULT false', () => {
    const sql = readFileSync(
      path.join(ROOT, 'supabase', 'migrations', '20260627234657_anon_visit_rpcs.sql'),
      'utf-8',
    );
    expect(sql).toContain('p_include_synthetic boolean DEFAULT false');
    // 합성 제외 필터가 존재
    expect(sql).toContain('a.is_synthetic = false');
  });

  it('클라이언트(useAdminKPI)는 include_synthetic=true 를 전달하지 않는다', () => {
    const hook = readFileSync(path.join(ROOT, 'src', 'hooks', 'useAdminKPI.tsx'), 'utf-8');
    expect(hook).not.toContain('p_include_synthetic');
    expect(hook).not.toMatch(/include_synthetic\s*:\s*true/);
  });
});

// [CL-ADMIN-KST-CUMSUM-20260709-073000] R11 확정결함: 누적 가입자 baseline 컷오프가 KST 반쪽 이전이라
//   트렌드 루프(KST) 첫 버킷과 비-KST 브라우저에서 경계 불일치 → 갭 구간 가입자 이중집계/누락.
//   불변식: baseline 컷오프(.lt, useAdminKPI.tsx:197)가 트렌드 루프 i=0 버킷 시작(startOfKstDayUtc, :492-493)과
//   '동일 인스턴트'여야, 가입자가 baseline(<cutoff) 또는 버킷(>=start) 중 정확히 하나에만 속해 이중집계/누락 불가.
//   이 등식은 프로세스 TZ와 무관하게 성립해야 한다(TZ 무관 계약). 버그 코드는 date-fns startOfDay(로컬)라
//   KST 아닌 TZ(예: GitHub Actions UTC)에서 이 테스트가 RED.
describe('golden: 누적 가입자 경계 정렬(cutoff == 트렌드 첫 KST 버킷 · TZ 무관)', () => {
  const bucket0Start = (endDate: Date, periodDays: number): Date =>
    startOfKstDayUtc(subKstDays(endDate, Math.min(periodDays, 90) - 1)); // = useAdminKPI 트렌드 루프 i=0 (:492-493)

  it('컷오프(firstTrendBucketStart) == 트렌드 첫 KST 버킷 시작 — 7/30/90/200(90캡) 전부', () => {
    const end = new Date('2026-07-09T05:00:00Z'); // KST 7/9 14:00 (UTC 브라우저면 로컬 startOfDay와 KST가 9h 갭)
    for (const periodDays of [7, 30, 90, 200]) {
      expect(firstTrendBucketStart(end, periodDays).getTime()).toBe(bucket0Start(end, periodDays).getTime());
    }
  });

  it('경계 정렬 → 갭 구간 가입자 이중집계/누락 불가(단일 소속)', () => {
    const end = new Date('2026-07-09T05:00:00Z');
    const cutoff = firstTrendBucketStart(end, 30).getTime();
    const bStart = bucket0Start(end, 30).getTime();
    expect(cutoff).toBe(bStart); // 동일 인스턴트 = 갭/중복 0
    // 임의 가입 인스턴트는 baseline(<cutoff)과 버킷0(>=bStart) 중 정확히 하나에만 속한다.
    for (const t of [cutoff - 1, cutoff, cutoff + 1, cutoff - 9 * 3600_000, cutoff + 9 * 3600_000]) {
      const inBaseline = t < cutoff;
      const inBucket0 = t >= bStart;
      expect(inBaseline && inBucket0).toBe(false); // 이중집계 불가
      expect(inBaseline || inBucket0).toBe(true); // 누락 불가
    }
  });
});
