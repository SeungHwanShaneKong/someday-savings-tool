// [CL-COVERAGE50-20260620] timeline-fallback 단위 검증 — 미테스트 영역 커버리지 보강
//
// 대상: src/lib/timeline-fallback.ts → buildTimelineFallback(weddingDate, completedItems, _budgetTotal?)
// 계약(Contract):
//   - 외부 AI(Edge Function) 실패 시 CHECKLIST_TEMPLATES 기반 로컬 폴백 타임라인을 생성한다.
//   - 반환: { timeline: TimelineMonth[], dday_count: number }
//   - dday_count 는 음수가 될 수 없다(Math.max(0, ...)).
//   - 완료 항목(title, trim+소문자 비교)은 제외된다.
//   - 월별 키는 `YYYY-MM` 오름차순, 월 내 task 는 priority 순(high→medium→low)으로 정렬.
//   - priority: 현재 활성 기간=high, 다음 기간=medium, 나머지=low.
//   - deadline 은 `YYYY-MM-DD` 형식.
//   - 동일 입력 → 동일 출력(결정론적).
//
// 결정론 확보: vi.useFakeTimers + setSystemTime 으로 "today" 고정.
// dday_count 는 UTC 절대 instant 차이 기반이라 TZ 무관 → 정확값 단언 가능.
// month-key/deadline 문자열은 로컬 TZ 의존이므로 구조 불변식(형식/정렬/우선순위)으로 단언.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildTimelineFallback } from '@/lib/timeline-fallback';
import {
  CHECKLIST_TEMPLATES,
  PERIOD_ORDER,
  getActivePeriod,
  type ChecklistPeriod,
} from '@/lib/checklist-templates';
import type { TimelineResult } from '@/hooks/useTimelineOptimizer';

const FIXED_NOW = new Date('2026-06-20T00:00:00Z');

/** 폴백 결과의 모든 task 를 평탄화 */
function flattenTasks(res: TimelineResult) {
  return res.timeline.flatMap((m) => m.tasks);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('timeline-fallback · buildTimelineFallback', () => {
  // ─────────────────────────────────────────────────────────────
  // UT.1 Happy path: 미완료 항목 전체가 폴백 타임라인으로 배치되고 dday_count 양수
  // ─────────────────────────────────────────────────────────────
  it('UT.1 미완료 항목이 없을 때(=완료목록 비움) 모든 템플릿이 폴백에 포함되고 dday_count 는 양수다', () => {
    // 결혼식 ~9개월 후 (오늘=2026-06-20)
    const weddingDate = '2027-03-20';
    const res = buildTimelineFallback(weddingDate, []);

    const allTasks = flattenTasks(res);
    // 완료 항목이 없으므로 템플릿 전부가 포함되어야 한다.
    expect(allTasks.length).toBe(CHECKLIST_TEMPLATES.length);

    // dday_count: 절대 instant 차이 기반 → TZ 무관, 양수
    const expectedDday = Math.max(
      0,
      Math.ceil(
        (new Date(weddingDate).getTime() - FIXED_NOW.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    expect(res.dday_count).toBe(expectedDday);
    expect(res.dday_count).toBeGreaterThan(0);

    // 모든 task 는 계약상 4개 필드를 갖는다.
    for (const t of allTasks) {
      expect(typeof t.task).toBe('string');
      expect(t.task.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(t.priority);
      expect(typeof t.tip).toBe('string'); // nudgeMessage|description|'' → 항상 string
      expect(t.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // UT.2 Boundary: 과거 결혼식 → dday_count 0 으로 클램프 (음수 금지)
  // ─────────────────────────────────────────────────────────────
  it('UT.2 결혼식이 이미 지났으면 dday_count 는 음수가 아닌 0 으로 클램프된다', () => {
    // 오늘(2026-06-20)보다 과거
    const res = buildTimelineFallback('2026-01-01', []);
    expect(res.dday_count).toBe(0);
    expect(res.dday_count).toBeGreaterThanOrEqual(0);

    // 과거 결혼식이라도 항목들은 "현재 달로 올림" 처리되어 빈 타임라인이 아니다.
    expect(res.timeline.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────
  // AC.1 완료 필터링: title 을 trim + 대소문자 무시로 매칭하여 제외
  // ─────────────────────────────────────────────────────────────
  it('AC.1 완료 항목은 공백/대소문자를 무시하고 제목으로 매칭되어 폴백에서 제외된다', () => {
    const weddingDate = '2027-03-20';

    // 실제 템플릿 제목 2개를 변형(앞뒤 공백 + 대문자화)하여 완료 처리
    const title0 = CHECKLIST_TEMPLATES[0].title; // '예산 총액 정하기 (양가 지원 포함)'
    const title1 = CHECKLIST_TEMPLATES[1].title;
    const completed = [`   ${title0.toUpperCase()}   `, `${title1}  `];

    const baseline = buildTimelineFallback(weddingDate, []);
    const filtered = buildTimelineFallback(weddingDate, completed);

    const baseTasks = flattenTasks(baseline).map((t) => t.task);
    const filteredTasks = flattenTasks(filtered).map((t) => t.task);

    // 정확히 2개가 줄어들어야 한다.
    expect(filteredTasks.length).toBe(baseTasks.length - 2);
    // 제외된 두 제목은 결과에 더 이상 존재하지 않는다.
    expect(filteredTasks).not.toContain(title0);
    expect(filteredTasks).not.toContain(title1);
  });

  // ─────────────────────────────────────────────────────────────
  // AC.2 월별 정렬: month 키는 `YYYY-MM` 오름차순, 월 내 task 는 priority(high→medium→low)
  // ─────────────────────────────────────────────────────────────
  it('AC.2 월 키는 YYYY-MM 오름차순이고, 각 월 내부 task 는 priority(high→medium→low) 순서다', () => {
    const res = buildTimelineFallback('2027-03-20', []);

    // 월 키 오름차순 + 형식
    const months = res.timeline.map((m) => m.month);
    for (const m of months) expect(m).toMatch(/^\d{4}-\d{2}$/);
    const sorted = [...months].sort((a, b) => a.localeCompare(b));
    expect(months).toEqual(sorted);

    // 각 월 내부 priority 단조 비내림차순 (high=0 < medium=1 < low=2)
    const rank = { high: 0, medium: 1, low: 2 } as const;
    for (const month of res.timeline) {
      const ranks = month.tasks.map((t) => rank[t.priority]);
      const monotone = ranks.every((v, i) => i === 0 || ranks[i - 1] <= v);
      expect(monotone).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC.3 priority 매핑: 활성 기간=high, 다음 기간=medium, 그 외=low
  // ─────────────────────────────────────────────────────────────
  it('AC.3 활성 기간 task 는 high, 다음 기간은 medium, 나머지는 low 로 분류된다', () => {
    const weddingDate = '2027-03-20'; // ~9개월 → 활성 기간 'D-10~8m'
    const activePeriod = getActivePeriod(weddingDate);
    expect(activePeriod).toBe('D-10~8m'); // 계약 전제 고정
    const activeIdx = PERIOD_ORDER.indexOf(activePeriod as ChecklistPeriod);

    const res = buildTimelineFallback(weddingDate, []);

    // 제목 → 해당 템플릿 period 역참조 맵
    const titleToPeriod = new Map<string, ChecklistPeriod>();
    for (const t of CHECKLIST_TEMPLATES) titleToPeriod.set(t.title, t.period);

    for (const task of flattenTasks(res)) {
      const period = titleToPeriod.get(task.task)!;
      const idx = PERIOD_ORDER.indexOf(period);
      if (idx === activeIdx) {
        expect(task.priority).toBe('high');
      } else if (idx === activeIdx + 1) {
        expect(task.priority).toBe('medium');
      } else {
        expect(task.priority).toBe('low');
      }
    }

    // 활성/다음 기간 템플릿이 실제로 존재하므로 high/medium 이 최소 1개씩은 나와야 한다.
    const priorities = flattenTasks(res).map((t) => t.priority);
    expect(priorities).toContain('high');
    expect(priorities).toContain('medium');
  });

  // ─────────────────────────────────────────────────────────────
  // EC.1 결정론: 동일 입력 → 동일 출력 (외부 AI 비의존, 순수 함수)
  // ─────────────────────────────────────────────────────────────
  it('EC.1 동일 입력에 대해 두 번 호출하면 완전히 동일한 결과를 반환한다(결정론적)', () => {
    const weddingDate = '2027-03-20';
    const completed = [CHECKLIST_TEMPLATES[3].title];

    const a = buildTimelineFallback(weddingDate, completed, 50_000_000);
    const b = buildTimelineFallback(weddingDate, completed, 50_000_000);
    expect(a).toEqual(b);

    // _budgetTotal 은 출력에 영향을 주지 않는다(미사용 파라미터) → 값만 달라도 동일.
    const c = buildTimelineFallback(weddingDate, completed, 999);
    const d = buildTimelineFallback(weddingDate, completed); // 인자 생략
    expect(c).toEqual(a);
    expect(d).toEqual(a);
  });

  // ─────────────────────────────────────────────────────────────
  // EC.2 Empty/edge: 모든 항목 완료 시 빈 타임라인이지만 dday_count 는 유지
  // ─────────────────────────────────────────────────────────────
  it('EC.2 모든 항목이 완료되면 timeline 은 빈 배열이지만 dday_count 는 계속 계산된다', () => {
    const weddingDate = '2027-03-20';
    const allTitles = CHECKLIST_TEMPLATES.map((t) => t.title);

    const res = buildTimelineFallback(weddingDate, allTitles);
    expect(res.timeline).toEqual([]);

    const expectedDday = Math.max(
      0,
      Math.ceil(
        (new Date(weddingDate).getTime() - FIXED_NOW.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    expect(res.dday_count).toBe(expectedDday);
    expect(res.dday_count).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EC.3 과거 달 클램프: 먼 미래 결혼식이라도 가장 이른 월 키는 현재 달보다 이르지 않다
  // ─────────────────────────────────────────────────────────────
  it('EC.3 과거에 배치될 항목은 현재 달로 올림되어, 어떤 월 키도 현재 달(YYYY-MM)보다 이르지 않다', () => {
    // 결혼식이 단 2개월 후라면, 12~10개월 전 같은 항목은 모두 과거 → 현재 달로 클램프되어야 한다.
    const weddingDate = '2026-08-20';
    const res = buildTimelineFallback(weddingDate, []);

    // 현재 달 키 (구현과 동일한 로컬 시간 연산으로 산출)
    const now = new Date(FIXED_NOW);
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const month of res.timeline) {
      // localeCompare 정렬 키와 동일하게 사전식 비교 → 현재 달 이상이어야 한다.
      expect(month.month.localeCompare(currentKey)).toBeGreaterThanOrEqual(0);
    }
    // 적어도 한 개 이상의 월이 존재(과거 항목들이 사라지지 않고 현재 달로 모임).
    expect(res.timeline.length).toBeGreaterThan(0);
  });
});
