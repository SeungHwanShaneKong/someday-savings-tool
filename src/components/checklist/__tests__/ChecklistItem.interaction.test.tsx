// [CL-CHECKUX-20260709-232512] ChecklistItem — 조작 간소화(제목 클릭 expand·44px 체크·저장됨 인디케이터·인라인 예산 pill)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChecklistItem } from '../ChecklistItem';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useChecklist';

afterEach(() => {
  vi.useRealTimers();
});

function makeItem(over: Partial<ChecklistItemType> = {}): ChecklistItemType {
  return {
    id: 'i1',
    user_id: 'u1',
    template_id: null,
    budget_id: null,
    title: '커스텀 준비 항목', // 템플릿 미일치 제목 — 넛지 노이즈 차단
    period: 'D-12~10m',
    sort_order: 1,
    is_completed: false,
    completed_at: null,
    due_date: null,
    notes: null,
    depends_on: null,
    category_link: null,
    sub_category_link: null,
    is_custom: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function renderItem(
  item = makeItem(),
  handlers: Partial<{
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void | boolean | Promise<void | boolean>;
    onBudgetLink: (c: string, s: string) => void;
  }> = {},
) {
  const props = {
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onUpdateNotes: vi.fn(),
    ...handlers,
  };
  const utils = render(<ChecklistItem item={item} {...props} />);
  return { ...utils, props };
}

describe('ChecklistItem — 제목 클릭 expand', () => {
  it('IT1 제목 버튼 클릭 → 메모 패널 펼침(aria-expanded 동기), 재클릭 → 접힘', () => {
    renderItem();

    const titleBtn = screen.getByRole('button', { name: '커스텀 준비 항목' });
    expect(titleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByPlaceholderText('메모를 추가하세요...')).toBeNull();

    fireEvent.click(titleBtn);
    expect(titleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByPlaceholderText('메모를 추가하세요...')).toBeInTheDocument();

    fireEvent.click(titleBtn);
    expect(screen.queryByPlaceholderText('메모를 추가하세요...')).toBeNull();
  });

  it('IT2 기존 chevron 버튼(펼치기/접기)도 그대로 동작(회귀)', () => {
    renderItem();
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    expect(screen.getByPlaceholderText('메모를 추가하세요...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    expect(screen.queryByPlaceholderText('메모를 추가하세요...')).toBeNull();
  });
});

describe('ChecklistItem — 메모 "저장됨 ✓" 인디케이터', () => {
  it('IT3 입력 → 저장 중… → debounce(300ms) 후 저장 성공 → 저장됨 ✓ → 1.5s 후 소멸', async () => {
    vi.useFakeTimers();
    const onUpdateNotes = vi.fn().mockResolvedValue(true);
    renderItem(makeItem(), { onUpdateNotes });

    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    fireEvent.change(screen.getByPlaceholderText('메모를 추가하세요...'), {
      target: { value: '드레스샵 3곳 비교' },
    });
    expect(screen.getByText('저장 중…')).toBeInTheDocument();
    expect(onUpdateNotes).not.toHaveBeenCalled(); // debounce 이전

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onUpdateNotes).toHaveBeenCalledWith('i1', '드레스샵 3곳 비교');

    // 저장 Promise resolve 플러시
    await act(async () => {});
    expect(screen.getByText('저장됨 ✓')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByText('저장됨 ✓')).toBeNull();
  });

  it('IT4 저장 실패(false 반환) → "저장됨 ✓" 오표시 없이 인디케이터 종료', async () => {
    vi.useFakeTimers();
    const onUpdateNotes = vi.fn().mockResolvedValue(false);
    renderItem(makeItem(), { onUpdateNotes });

    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    fireEvent.change(screen.getByPlaceholderText('메모를 추가하세요...'), {
      target: { value: '실패 케이스' },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});

    expect(screen.queryByText('저장됨 ✓')).toBeNull();
    expect(screen.queryByText('저장 중…')).toBeNull();
  });
});

describe('ChecklistItem — 44px 체크 히트영역 + 원탭', () => {
  it('IT5 label 히트영역 클래스(min-h-11/min-w-11) + 체크박스 시각 h-5 w-5 유지 + onToggle', () => {
    const onToggle = vi.fn();
    renderItem(makeItem(), { onToggle });

    const hit = screen.getByTestId('checklist-checkbox-hit');
    expect(hit.tagName).toBe('LABEL');
    expect(hit.className).toContain('min-h-11');
    expect(hit.className).toContain('min-w-11');

    const checkbox = screen.getByRole('checkbox', { name: '커스텀 준비 항목 완료로 표시' });
    expect(checkbox.className).toContain('h-5');
    expect(checkbox.className).toContain('w-5');

    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('i1');
  });
});

describe('ChecklistItem — 예산 연결 인라인 pill', () => {
  it('IT6 링크 있는 항목은 펼치지 않아도 pill 노출 → 클릭 시 onBudgetLink(카테고리, 서브)', () => {
    const onBudgetLink = vi.fn();
    renderItem(
      makeItem({ category_link: 'main-ceremony', sub_category_link: 'venue', due_date: '2026-08-01' }),
      { onBudgetLink },
    );

    // 접힌 상태에서 바로 접근 가능(원클릭 단축)
    const pill = screen.getByRole('button', { name: '예산 연결' });
    fireEvent.click(pill);
    expect(onBudgetLink).toHaveBeenCalledTimes(1);
    expect(onBudgetLink).toHaveBeenCalledWith('main-ceremony', 'venue');
  });

  it('IT7 onBudgetLink 미전달/링크 없음 → pill 미노출(가짜 어포던스 금지)', () => {
    renderItem(makeItem({ category_link: 'main-ceremony', sub_category_link: 'venue' })); // 핸들러 없음
    expect(screen.queryByRole('button', { name: '예산 연결' })).toBeNull();

    const { props } = renderItem(makeItem(), { onBudgetLink: vi.fn() }); // 링크 없음
    expect(screen.queryByRole('button', { name: '예산 연결' })).toBeNull();
    expect(props.onToggle).not.toHaveBeenCalled();
  });
});
