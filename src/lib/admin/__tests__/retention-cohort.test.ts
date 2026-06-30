// [CL-FACT-RETENTION-20260630] computeRetentionMeasure 골든 — '관측 가능한 코호트' 분모(개선1 A4).
//   기존 deflate 결함(기념일 미도래 가입자까지 분모 포함)을 차단하고, 측정 불가 시 noData('데이터 없음')로 정직 표시.
import { describe, it, expect } from 'vitest';
import { computeRetentionMeasure } from '@/lib/admin/retention';

const iso = (y: number, mo: number, d: number, h = 10) => new Date(y, mo, d, h, 0, 0).toISOString();
const observableEnd = new Date(2026, 5, 30, 23, 59, 59); // 6/30 관측 종료(endDate)

describe('computeRetentionMeasure — 관측 가능 코호트 분모', () => {
  it('RC.1 D7: 관측가능 2명 중 1명 재방문 → 50% · coverage{1,2}(미도래 가입자 분모 제외)', () => {
    const profiles = [
      { user_id: 'a', created_at: iso(2026, 5, 1) },  // 6/1 → D7=6/8 관측가능
      { user_id: 'b', created_at: iso(2026, 5, 1) },  // 6/1 → D7=6/8 관측가능(미재방문)
      { user_id: 'c', created_at: iso(2026, 5, 28) }, // 6/28 → D7=7/5 미도래 → 분모 제외
    ];
    const pageViews = [{ user_id: 'a', created_at: iso(2026, 5, 8, 9) }]; // a 만 D7 재방문
    const m = computeRetentionMeasure(profiles, pageViews, 7, observableEnd);
    expect(m).toMatchObject({ state: 'ok', value: 50, coverage: { n: 1, m: 2 } });
  });

  it('RC.2 D30: 전원 미도래(기간 짧음) → noData(데이터 없음, 0% 아님)', () => {
    const profiles = [
      { user_id: 'a', created_at: iso(2026, 5, 1) },  // D30=7/1 > 6/30 미도래
      { user_id: 'c', created_at: iso(2026, 5, 28) },
    ];
    const m = computeRetentionMeasure(profiles, [], 30, observableEnd);
    expect(m.state).toBe('no-data');
    expect(m.value).toBeNull();
  });

  it('RC.3 관측가능하나 아무도 재방문 안 함 → 진짜 0%(zero), coverage 유지', () => {
    const profiles = [{ user_id: 'a', created_at: iso(2026, 5, 1) }];
    const m = computeRetentionMeasure(profiles, [], 7, observableEnd);
    expect(m).toMatchObject({ state: 'zero', value: 0, coverage: { n: 0, m: 1 } });
  });

  it('RC.4 미도래 가입자만 → eligible 0 → noData(deflate 대신 정직)', () => {
    const profiles = [{ user_id: 'late', created_at: iso(2026, 5, 29) }]; // D7=7/6 미도래
    const m = computeRetentionMeasure(profiles, [], 7, observableEnd);
    expect(m.state).toBe('no-data');
  });
});
