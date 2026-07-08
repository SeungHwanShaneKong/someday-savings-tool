// [CL-ADMIN-KST-20260709-000939] KST 달력일 경계 — 경계 ±1초·TZ 불변 검증(전 지표 정확성의 토대).
import { describe, it, expect } from 'vitest';
import {
  startOfKstDayUtc,
  endOfKstDayUtc,
  subKstDays,
  kstDayKey,
  kstMonthDayLabel,
  startOfKstDayUtcISO,
} from '../kst-time';

describe('kst-time — KST 달력일 경계', () => {
  it('KST 자정 경계: 14:59:59Z=전날, 15:00:00Z=다음날(KST 00:00)', () => {
    // 2026-07-08T15:00:00Z = 2026-07-09 00:00 KST
    expect(kstDayKey(new Date('2026-07-08T14:59:59.999Z'))).toBe('2026-07-08');
    expect(kstDayKey(new Date('2026-07-08T15:00:00.000Z'))).toBe('2026-07-09');
  });

  it('startOfKstDayUtc: KST 00:00 의 실제 UTC 인스턴트', () => {
    // KST 2026-07-09 00:00 == UTC 2026-07-08 15:00
    expect(startOfKstDayUtcISO(new Date('2026-07-08T15:00:00Z'))).toBe('2026-07-08T15:00:00.000Z');
    // 같은 KST 일자 내 어느 시각이든 동일한 시작
    expect(startOfKstDayUtcISO(new Date('2026-07-09T05:30:00Z'))).toBe('2026-07-08T15:00:00.000Z');
    expect(startOfKstDayUtcISO(new Date('2026-07-09T14:59:59Z'))).toBe('2026-07-08T15:00:00.000Z');
  });

  it('endOfKstDayUtc: 시작 + 24h - 1ms', () => {
    const d = new Date('2026-07-09T05:00:00Z');
    expect(endOfKstDayUtc(d).getTime()).toBe(startOfKstDayUtc(d).getTime() + 86_400_000 - 1);
  });

  it('subKstDays: 절대 24h*n 차감', () => {
    const d = new Date('2026-07-09T00:00:00Z');
    expect(subKstDays(d, 7).toISOString()).toBe('2026-07-02T00:00:00.000Z');
  });

  it('kstMonthDayLabel: KST 기준 M/d', () => {
    expect(kstMonthDayLabel(new Date('2026-07-08T15:00:00Z'))).toBe('7/9'); // KST 7/9
    expect(kstMonthDayLabel(new Date('2026-07-08T14:00:00Z'))).toBe('7/8');
  });

  it('TZ 불변: getTime 기반이라 프로세스 TZ와 무관하게 동일 결과', () => {
    // 절대시각만 사용하므로 어떤 로컬 TZ 에서도 동일해야 한다(회귀 가드).
    const d = new Date('2026-07-08T15:00:00Z');
    expect(kstDayKey(d)).toBe('2026-07-09');
    expect(startOfKstDayUtc(d).getTime()).toBe(Date.parse('2026-07-08T15:00:00Z'));
  });
});
