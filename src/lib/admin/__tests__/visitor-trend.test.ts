// [CL-ADMIN-VISITOR-20260709-231827] mergeVisitorTrend 단위 테스트 — 일별 접속자(익명+로그인) 병합 계약 고정.
//   TZ 불변성: 조인 키가 'M/d' 문자열 라벨(양쪽 소스 모두 KST 달력일에서 파생)이라 이 함수 자체는 TZ 무관 —
//   라벨 생성부의 TZ 결정론은 kst-time 골든 테스트(kst-time.test.ts)가 이미 커버(구조적 상속).
import { describe, it, expect } from 'vitest';
import { mergeVisitorTrend } from '@/lib/admin/trend-compute';

describe('mergeVisitorTrend — 익명 세션 + 로그인 DAU 병합', () => {
  it('라벨 조인 정확성 — 같은 M/d 라벨끼리 합산, 결과 길이 = trend(dense) 길이', () => {
    const out = mergeVisitorTrend(
      [{ date: '7/1', dau: 2 }, { date: '7/2', dau: 3 }],
      [{ day: '7/1', sessions: 5 }, { day: '7/2', sessions: 1 }],
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ date: '7/1', anonSessions: 5, loginUsers: 2, total: 7 });
    expect(out[1]).toMatchObject({ date: '7/2', anonSessions: 1, loginUsers: 3, total: 4 });
  });

  it('sparse anon — trend 에만 있는 날은 anonSessions 0 필', () => {
    const out = mergeVisitorTrend(
      [{ date: '7/1', dau: 4 }, { date: '7/2', dau: 2 }, { date: '7/3', dau: 0 }],
      [{ day: '7/2', sessions: 6 }],
    );
    expect(out.map((p) => p.anonSessions)).toEqual([0, 6, 0]);
    expect(out.map((p) => p.total)).toEqual([4, 8, 0]);
  });

  it('trend 프레임 밖의 anon 일자는 무시(dense 프레임 기준 순회)', () => {
    const out = mergeVisitorTrend(
      [{ date: '7/1', dau: 1 }],
      [{ day: '6/30', sessions: 99 }, { day: '7/1', sessions: 2 }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].anonSessions).toBe(2);
  });

  it('total/loginRatio 산술 — ratio = dau/total×100 (반올림은 표시부 책임)', () => {
    const [p] = mergeVisitorTrend([{ date: '7/1', dau: 2 }], [{ day: '7/1', sessions: 5 }]);
    expect(p.total).toBe(7);
    expect(p.loginRatio).toBeCloseTo((2 / 7) * 100, 10);
  });

  it('total 0 → loginRatio null (0% 오도 금지)', () => {
    const [p] = mergeVisitorTrend([{ date: '7/1', dau: 0 }], []);
    expect(p.total).toBe(0);
    expect(p.loginRatio).toBeNull();
  });

  it('빈 anon(RPC 미배포/무데이터) → 전 구간 anonSessions 0, 로그인만 집계', () => {
    const out = mergeVisitorTrend([{ date: '7/1', dau: 3 }, { date: '7/2', dau: 1 }], []);
    expect(out.every((p) => p.anonSessions === 0)).toBe(true);
    expect(out.map((p) => p.total)).toEqual([3, 1]);
    expect(out[0].loginRatio).toBe(100);
  });

  it('dau undefined(옵셔널 필드) → 0 취급', () => {
    const [p] = mergeVisitorTrend([{ date: '7/1' }], [{ day: '7/1', sessions: 4 }]);
    expect(p.loginUsers).toBe(0);
    expect(p.total).toBe(4);
    expect(p.loginRatio).toBe(0);
  });

  it('동일 라벨 anon 중복 행은 합산(방어)', () => {
    const [p] = mergeVisitorTrend(
      [{ date: '7/1', dau: 1 }],
      [{ day: '7/1', sessions: 2 }, { day: '7/1', sessions: 3 }],
    );
    expect(p.anonSessions).toBe(5);
  });

  it('빈 trend → 빈 결과(입력 불변)', () => {
    const anon = [{ day: '7/1', sessions: 2 }];
    const snapshot = JSON.parse(JSON.stringify(anon));
    expect(mergeVisitorTrend([], anon)).toEqual([]);
    expect(anon).toEqual(snapshot);
  });
});
