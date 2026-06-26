// [CL-EDITLABEL-20260626] 항목별 최근 편집자(나/파트너) 라벨 순수 로직 검증.
//  개선2: budget_items.last_edited_by(uuid) → "나" | partnerName | "파트너" | null(미상/개인모드).
//  changed-since.ts 의 "내것/null 보수적 제외" 철학과 정합. Supabase/React 비의존 → CI 완전 검증.
import { describe, it, expect } from 'vitest';
import { getEditorLabel } from '../editor-label';

describe('getEditorLabel — 최근 편집자 라벨(나 vs 파트너)', () => {
  it('EL.1 내 편집 → "나"', () => {
    expect(getEditorLabel('me', 'me', '상대')).toBe('나');
  });
  it('EL.2 파트너 편집 + 이름 → 파트너 이름', () => {
    expect(getEditorLabel('partner', 'me', '지윤')).toBe('지윤');
  });
  it('EL.3 파트너 편집 + 이름 없음 → "파트너" 폴백', () => {
    expect(getEditorLabel('partner', 'me', null)).toBe('파트너');
  });
  it('EL.4 파트너 편집 + 공백 이름 → "파트너" 폴백(trim)', () => {
    expect(getEditorLabel('partner', 'me', '   ')).toBe('파트너');
  });
  it('EL.5 last_edited_by null(레거시/미적용) → null(숨김)', () => {
    expect(getEditorLabel(null, 'me', '지윤')).toBeNull();
  });
  it('EL.6 myUserId null(미인증) → null', () => {
    expect(getEditorLabel('partner', null, '지윤')).toBeNull();
  });
  it('EL.7 myUserId 빈문자 → null', () => {
    expect(getEditorLabel('partner', '', '지윤')).toBeNull();
  });
  it('EL.8 last_edited_by undefined → null', () => {
    expect(getEditorLabel(undefined, 'me', '지윤')).toBeNull();
  });
  it('EL.9 내 편집 + 파트너이름 없음 → "나"', () => {
    expect(getEditorLabel('me', 'me', null)).toBe('나');
  });
  it('EL.10 파트너 이름 trailing 공백 → trim된 이름', () => {
    expect(getEditorLabel('partner', 'me', '지윤 ')).toBe('지윤');
  });
});
