// [CL-CHECKUX-20260709-232512] timeline-apply — AI 타임라인 → 체크리스트 적용 계획 단위 검증
// + getPeriodForDate 경계(getActivePeriod 동일 프레임 · duedate-overflow 테스트의 월말 경계 미러)
import { describe, it, expect } from 'vitest';
import {
  matchTimelineToChecklist,
  type ApplyTargetItem,
  type TimelineTaskLike,
} from '../timeline-apply';
import { getPeriodForDate } from '../checklist-templates';

const WEDDING = '2027-01-01';

let seq = 0;
function makeItem(over: Partial<ApplyTargetItem> & { title: string }): ApplyTargetItem {
  return {
    id: `item-${++seq}`,
    due_date: null,
    is_completed: false,
    ...over,
  };
}

function makeResult(tasks: TimelineTaskLike[], month = '2026-08') {
  return { timeline: [{ month, tasks }] };
}

describe('matchTimelineToChecklist — 매칭/적용 계획', () => {
  it('A1 정확 매치(공백·가운뎃점 차이 무시) → matches 에 itemId·oldDue·newDue', () => {
    const item = makeItem({ title: '스드메 패키지 계약', due_date: '2026-09-01' });
    const task = { task: '스드메·패키지  계약', deadline: '2026-08-20' };
    const plan = matchTimelineToChecklist(makeResult([task]), [item], WEDDING);

    expect(plan.matches).toEqual([
      { itemId: item.id, title: '스드메 패키지 계약', oldDue: '2026-09-01', newDue: '2026-08-20' },
    ]);
    expect(plan.additions).toEqual([]);
    expect(plan.decisions.get(task)).toMatchObject({ kind: 'apply', itemId: item.id });
  });

  it('A2 퍼지 매치 — ①부분 포함(includes) ②토큰 중첩 ≥ 0.5(어순 무관)', () => {
    const inc = makeItem({ title: '본식 드레스 투어 예약', due_date: null });
    const tok = makeItem({ title: '웨딩홀 납부 계약금', due_date: '2026-07-01' });
    const tInc = { task: '드레스 투어', deadline: '2026-08-10' };
    const tTok = { task: '웨딩홀 계약금 납부', deadline: '2026-08-15' };
    const plan = matchTimelineToChecklist(makeResult([tInc, tTok]), [inc, tok], WEDDING);

    expect(plan.matches).toHaveLength(2);
    expect(plan.decisions.get(tInc)).toMatchObject({ kind: 'apply', itemId: inc.id, oldDue: null });
    expect(plan.decisions.get(tTok)).toMatchObject({ kind: 'apply', itemId: tok.id });
  });

  it('A3 무매치 → additions(기간은 getPeriodForDate 로 사상)', () => {
    const item = makeItem({ title: '청첩장 제작' });
    const task = { task: '완전히 새로운 준비 항목', deadline: '2026-11-20' };
    const plan = matchTimelineToChecklist(makeResult([task]), [item], WEDDING);

    expect(plan.matches).toEqual([]);
    // 2026-11-20 → 결혼(2027-01-01)까지 42일 ≈ 1.38개월 → 'D-2~1m'
    expect(plan.additions).toEqual([
      { title: '완전히 새로운 준비 항목', deadline: '2026-11-20', period: 'D-2~1m' },
    ]);
    expect(plan.decisions.get(task)).toMatchObject({ kind: 'add', period: 'D-2~1m' });
  });

  it('A4 동일 기한 → 무의미한 쓰기 스킵(same-due)', () => {
    const item = makeItem({ title: '신혼여행 항공권 예약', due_date: '2026-08-20' });
    const task = { task: '신혼여행 항공권 예약', deadline: '2026-08-20' };
    const plan = matchTimelineToChecklist(makeResult([task]), [item], WEDDING);

    expect(plan.matches).toEqual([]);
    expect(plan.additions).toEqual([]);
    expect(plan.decisions.get(task)).toEqual({ kind: 'skip', reason: 'same-due' });
  });

  it('A5 완료 항목과만 매치 → 기한 적용도 중복 추가도 하지 않음(already-done)', () => {
    const done = makeItem({ title: '예식장 계약', is_completed: true, due_date: '2026-03-01' });
    const task = { task: '예식장 계약', deadline: '2026-08-01' };
    const plan = matchTimelineToChecklist(makeResult([task]), [done], WEDDING);

    expect(plan.matches).toEqual([]);
    expect(plan.additions).toEqual([]);
    expect(plan.decisions.get(task)).toEqual({ kind: 'skip', reason: 'already-done' });
  });

  it('A6 잘못된 deadline(형식 위반·존재하지 않는 날짜) → invalid-deadline 스킵', () => {
    const item = makeItem({ title: '축가 섭외' });
    const bad1 = { task: '축가 섭외', deadline: 'soon' };
    const bad2 = { task: '축가 섭외', deadline: '2026-13-45' };
    const plan = matchTimelineToChecklist(makeResult([bad1, bad2]), [item], WEDDING);

    expect(plan.matches).toEqual([]);
    expect(plan.additions).toEqual([]);
    expect(plan.decisions.get(bad1)).toEqual({ kind: 'skip', reason: 'invalid-deadline' });
    expect(plan.decisions.get(bad2)).toEqual({ kind: 'skip', reason: 'invalid-deadline' });
  });

  it('A7 동일 제목 무매치 task 가 여러 달 반복 → 추가는 1회만(duplicate 스킵)', () => {
    const t1 = { task: '새로운 항목', deadline: '2026-08-10' };
    const t2 = { task: '새로운 항목', deadline: '2026-09-10' };
    const plan = matchTimelineToChecklist(
      { timeline: [{ month: '2026-08', tasks: [t1] }, { month: '2026-09', tasks: [t2] }] },
      [],
      WEDDING,
    );
    expect(plan.additions).toHaveLength(1);
    expect(plan.decisions.get(t2)).toEqual({ kind: 'skip', reason: 'duplicate' });
  });

  it('A8 결혼식 이후 deadline 의 무매치 task → 기간 밖(null)을 마지막 버킷 D-1~0 로 클램프', () => {
    const task = { task: '허니문 후 정리', deadline: '2027-03-01' };
    const plan = matchTimelineToChecklist(makeResult([task]), [], WEDDING);
    expect(plan.additions[0]?.period).toBe('D-1~0');
  });

  it('A9 항목당 1회 귀속(그리디) — 같은 항목을 두 task 가 중복 선점하지 않음', () => {
    const item = makeItem({ title: '드레스 투어', due_date: '2026-06-01' });
    const t1 = { task: '드레스 투어', deadline: '2026-08-01' };
    const t2 = { task: '드레스 투어', deadline: '2026-09-01' };
    const plan = matchTimelineToChecklist(makeResult([t1, t2]), [item], WEDDING);

    expect(plan.matches).toHaveLength(1);
    expect(plan.decisions.get(t1)).toMatchObject({ kind: 'apply', newDue: '2026-08-01' });
    // 두 번째는 항목이 이미 귀속돼 무매치 → 추가 후보
    expect(plan.decisions.get(t2)).toMatchObject({ kind: 'add' });
  });
});

describe('getPeriodForDate — getActivePeriod 동일 프레임 경계', () => {
  it('P1 결혼 직전(17일 전) → D-1~0', () => {
    expect(getPeriodForDate(WEDDING, '2026-12-15')).toBe('D-1~0');
  });

  it('P2 10개월 초과 이전 → D-12~10m (상한 클램프)', () => {
    expect(getPeriodForDate(WEDDING, '2026-02-20')).toBe('D-12~10m');
    expect(getPeriodForDate(WEDDING, '2025-06-01')).toBe('D-12~10m');
  });

  it('P3 결혼식 직후 1개월 이내 → D-1~0, 1개월 초과 → null', () => {
    expect(getPeriodForDate(WEDDING, '2027-01-15')).toBe('D-1~0');
    expect(getPeriodForDate(WEDDING, '2027-03-01')).toBeNull();
  });

  it('P4 월말 경계(duedate-overflow 미러) — ms 차 산술이라 setMonth 오버플로 자체가 없음', () => {
    // 2026-03-31 결혼, 2026-02-28 기준 → 31일 ≈ 1.02개월 → D-2~1m (짧은 달 롤포워드 붕괴 없음)
    expect(getPeriodForDate('2026-03-31', '2026-02-28')).toBe('D-2~1m');
  });

  it('P5 잘못된 날짜 입력 → null (조용한 방어)', () => {
    expect(getPeriodForDate(WEDDING, 'garbage')).toBeNull();
    expect(getPeriodForDate('garbage', '2026-08-01')).toBeNull();
  });
});
