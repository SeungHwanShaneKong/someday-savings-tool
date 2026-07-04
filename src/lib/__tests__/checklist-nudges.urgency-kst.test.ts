// [CL-VULN-R10-20260704 | 핵심] getUrgencyLevel KST 달력일 프레임 회귀 가드
// 결함: 로컬 인스턴트(new Date())와 UTC자정 인스턴트(new Date(dueDate))를 원시 뺄셈 →
// KST 사용자에게 마감 당일 오전 9시(=UTC 자정)부터 자정까지 '기한초과'로 오표시.
// 근본수정: toKSTDateString()/daysBetween() 로 달력일 정수 비교(프레임 통일).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getUrgencyLevel } from '../checklist-nudges';

afterEach(() => {
  vi.useRealTimers();
});

describe('getUrgencyLevel() — KST 달력일 프레임', () => {
  it('KST1: 마감 당일 KST 오전(=UTC 자정 직후)은 overdue 가 아니라 urgent', () => {
    // 2026-07-04T01:00:00Z = KST 2026-07-04 10:00 (같은 KST 달력일)
    // 현재(버그) 코드: due(2026-07-04T00:00:00Z) - now(01:00Z) = -1시간 → diffDays<0 → overdue (실패)
    // 수정 코드: daysBetween('2026-07-04','2026-07-04') = 0 → urgent
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T01:00:00Z'));
    expect(getUrgencyLevel('2026-07-04', false)).toBe('urgent');
  });

  it('KST2: 같은 시각, 어제(2026-07-03) 마감은 overdue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T01:00:00Z'));
    expect(getUrgencyLevel('2026-07-03', false)).toBe('overdue');
  });

  it('KST3: 7일 후 마감은 urgent 경계(<=7)', () => {
    // KST 2026-07-04 기준 +7일 = 2026-07-11
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T01:00:00Z'));
    expect(getUrgencyLevel('2026-07-11', false)).toBe('urgent');
  });

  it('KST4: 8일 후 마감은 soon (urgent 경계 초과, <=30)', () => {
    // KST 2026-07-04 기준 +8일 = 2026-07-12
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T01:00:00Z'));
    expect(getUrgencyLevel('2026-07-12', false)).toBe('soon');
  });

  it('KST5: 타임스탬프 형태 dueDate 도 slice(0,10) 로 안전 처리', () => {
    // dueDate 가 ISO 타임스탬프여도 달력일만 취해 당일=urgent 유지
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T01:00:00Z'));
    expect(getUrgencyLevel('2026-07-04T00:00:00Z', false)).toBe('urgent');
  });

  it('KST6: KST 자정 직전(=UTC 15:00)에도 당일 마감은 urgent(경계 하단)', () => {
    // 2026-07-04T14:59:59Z = KST 2026-07-04 23:59:59 (아직 당일)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T14:59:59Z'));
    expect(getUrgencyLevel('2026-07-04', false)).toBe('urgent');
  });

  it('KST7: 완료/무기한 단락은 프레임과 무관하게 보존', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T01:00:00Z'));
    expect(getUrgencyLevel('2026-07-03', true)).toBe('done');
    expect(getUrgencyLevel(null, false)).toBe('normal');
  });
});
