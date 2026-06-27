// [CL-AUDIT2-R5-PERF-20260628] computeRetentionRate 골든/회귀 — O(P×V)→O(P+V) 최적화의 '동치' 입증.
//  로컬 일경계(startOfDay/endOfDay) 기준 고정 데이터셋으로 d1/d7/d30 정확값을 잠근다.
import { describe, it, expect } from 'vitest';
import { computeRetentionRate } from '@/lib/admin/retention';

// 로컬 시각으로 구성(월 0-indexed: 5=June) 후 ISO 문자열로 전달 → 함수가 동일 인스턴트로 파싱.
const iso = (y: number, mo: number, d: number, h = 10) => new Date(y, mo, d, h, 0, 0).toISOString();

describe('computeRetentionRate (리텐션 동치 골든)', () => {
  // 4명 모두 6/1 가입. u1=d1 재방문, u2=d7, u3=재방문 없음(윈도우 밖 6/5만), u4=d30, anon(null)=무시.
  const profiles = [
    { user_id: 'u1', created_at: iso(2026, 5, 1) },
    { user_id: 'u2', created_at: iso(2026, 5, 1) },
    { user_id: 'u3', created_at: iso(2026, 5, 1) },
    { user_id: 'u4', created_at: iso(2026, 5, 1) },
  ];
  const pageViews = [
    { user_id: 'u1', created_at: iso(2026, 5, 2, 9) },  // d1 윈도우(6/2)
    { user_id: 'u2', created_at: iso(2026, 5, 8, 9) },  // d7 윈도우(6/8)
    { user_id: 'u3', created_at: iso(2026, 5, 5, 9) },  // 윈도우 밖
    { user_id: 'u4', created_at: iso(2026, 6, 1, 9) },  // d30 윈도우(7/1)
    { user_id: null, created_at: iso(2026, 5, 2, 9) },  // 익명 → 무시
  ];

  it('RET.1 d1 = 25% (u1만)', () => {
    expect(computeRetentionRate(profiles, pageViews, 1)).toBe(25);
  });
  it('RET.2 d7 = 25% (u2만)', () => {
    expect(computeRetentionRate(profiles, pageViews, 7)).toBe(25);
  });
  it('RET.3 d30 = 25% (u4만)', () => {
    expect(computeRetentionRate(profiles, pageViews, 30)).toBe(25);
  });
  it('RET.4 profiles 0건 → 0', () => {
    expect(computeRetentionRate([], pageViews, 1)).toBe(0);
  });
  it('RET.5 일경계 inclusive — 윈도우 시작 자정/끝 직전 모두 카운트', () => {
    const p = [{ user_id: 'x', created_at: iso(2026, 5, 1) }];
    const atStart = [{ user_id: 'x', created_at: new Date(2026, 5, 2, 0, 0, 0).toISOString() }];
    const atEnd = [{ user_id: 'x', created_at: new Date(2026, 5, 2, 23, 59, 59).toISOString() }];
    expect(computeRetentionRate(p, atStart, 1)).toBe(100);
    expect(computeRetentionRate(p, atEnd, 1)).toBe(100);
  });
  it('RET.6 윈도우 밖(전날/다음날)은 미카운트', () => {
    const p = [{ user_id: 'x', created_at: iso(2026, 5, 1) }];
    const before = [{ user_id: 'x', created_at: new Date(2026, 5, 1, 23, 59, 59).toISOString() }];
    const after = [{ user_id: 'x', created_at: new Date(2026, 5, 3, 0, 0, 1).toISOString() }];
    expect(computeRetentionRate(p, before, 1)).toBe(0);
    expect(computeRetentionRate(p, after, 1)).toBe(0);
  });
});
