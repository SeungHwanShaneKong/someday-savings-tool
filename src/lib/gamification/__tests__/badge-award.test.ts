// [CL-AUDIT-BADGE-IDEMPOTENT-20260626] 적대적 감사 D1: 배지 보상 멱등성.
//  버그: useBadgeUnlock 이 DB insert 가 duplicate(이미 획득)여도 fall-through 해 total_points 를 재지급(영구 인플레이션) +
//  배치 insert 원자 롤백 시 신규 배지가 DB 미기록인데도 점수/상태 지급(상태 불일치).
//  근본수정: '실제 DB 삽입된 badge_id' 집합으로만 보상하는 순수 함수 selectAwardableBadges 로 결정 분리.
import { describe, it, expect } from 'vitest';
import { selectAwardableBadges } from '../rule-engine';
import type { BadgeDefinition } from '../types';

const badge = (id: string, slug: string, points: number): BadgeDefinition =>
  ({
    id, slug, points_reward: points, is_active: true, display_order: 1,
    name: slug, description: '', icon: '', tier: 'bronze',
    unlock_rule: { type: 'first_budget' },
  }) as unknown as BadgeDefinition;

describe('selectAwardableBadges — 실제 삽입된 배지에만 보상(멱등)', () => {
  const A = badge('id-a', 'first_budget', 10);
  const B = badge('id-b', 'first_checklist', 20);

  it('BA.1 전부 신규 삽입 → 전부 보상', () => {
    const r = selectAwardableBadges([A, B], new Set(['id-a', 'id-b']));
    expect(r.total_points_gained).toBe(30);
    expect(r.slugs).toEqual(['first_budget', 'first_checklist']);
    expect(r.badges).toHaveLength(2);
  });

  it('BA.2 중복(이미 획득)은 삽입 집합에서 빠짐 → 점수 재지급 0', () => {
    // A 는 이미 존재(insert 안 됨), B 만 신규 삽입됨
    const r = selectAwardableBadges([A, B], new Set(['id-b']));
    expect(r.total_points_gained).toBe(20); // A(10) 재지급 금지
    expect(r.slugs).toEqual(['first_checklist']);
    expect(r.badges).toHaveLength(1);
  });

  it('BA.3 전부 중복(삽입 0) → 보상·슬러그·모달 전부 없음', () => {
    const r = selectAwardableBadges([A, B], new Set());
    expect(r.total_points_gained).toBe(0);
    expect(r.slugs).toEqual([]);
    expect(r.badges).toEqual([]);
  });
});
