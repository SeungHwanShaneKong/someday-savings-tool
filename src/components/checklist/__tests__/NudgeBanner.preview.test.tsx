// [CL-TOP20-P3-CHECK-20260703-030000] NudgeBanner — D-day 실시간 프리뷰 + 빈 상태 샘플 스켈레톤
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NudgeBanner } from '../NudgeBanner';
import { CHECKLIST_TEMPLATES } from '@/lib/checklist-templates';

function renderNoDday(showSamplePreview: boolean) {
  return render(
    <NudgeBanner
      type="no-dday"
      onSave={vi.fn(async () => {})}
      actionLabel="D-day 설정하기"
      showSamplePreview={showSamplePreview}
    />,
  );
}

/** 현재 달력에서 '오늘' 날짜 버튼 클릭 (outside-day 제외 → 결정론)
 *  react-day-picker v8 은 날짜 버튼에 role="gridcell" 을 명시한다. */
function clickToday() {
  const dayNum = String(new Date().getDate());
  const candidates = screen
    .getAllByRole('gridcell')
    .filter(
      (b) =>
        b.textContent === dayNum && !b.className.includes('day-outside'),
    );
  expect(candidates.length).toBeGreaterThan(0);
  fireEvent.click(candidates[0]);
}

describe('NudgeBanner — 빈 상태 샘플 스켈레톤 프리뷰', () => {
  it('B1 showSamplePreview → 라벨 + 실제 템플릿 앞 3개 항목 노출(읽기전용)', () => {
    renderNoDday(true);
    expect(screen.getByText('날짜를 설정하면 이렇게 생성돼요')).toBeInTheDocument();
    for (const template of CHECKLIST_TEMPLATES.slice(0, 3)) {
      expect(screen.getByText(template.title)).toBeInTheDocument();
    }
    // 읽기전용: 샘플 리스트 안에 체크박스/버튼 등 인터랙션 요소 없음
    const list = screen.getByRole('list', { name: '체크리스트 미리보기 예시' });
    expect(list.querySelectorAll('button, input')).toHaveLength(0);
  });

  it('B2 showSamplePreview=false → 스켈레톤 미노출(기존 배너 회귀 0)', () => {
    renderNoDday(false);
    expect(screen.queryByText('날짜를 설정하면 이렇게 생성돼요')).toBeNull();
    expect(
      screen.getByRole('button', { name: /D-day 설정하기/ }),
    ).toBeInTheDocument();
  });
});

describe('NudgeBanner — D-day 실시간 프리뷰 카드', () => {
  it('B3 날짜 선택 전에는 프리뷰 카드 없음', () => {
    renderNoDday(false);
    fireEvent.click(screen.getByRole('button', { name: /D-day 설정하기/ }));
    // Popover 는 열렸지만(저장 버튼 존재) 프리뷰는 아직 없음
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    expect(screen.queryByTestId('dday-preview')).toBeNull();
  });

  it('B4 날짜(오늘) 선택 → D-Day 라벨 + 배치 안내 문구 실시간 표시', () => {
    renderNoDday(false);
    fireEvent.click(screen.getByRole('button', { name: /D-day 설정하기/ }));
    clickToday();

    const preview = screen.getByTestId('dday-preview');
    expect(preview).toHaveTextContent('D-Day');
    expect(preview).toHaveTextContent(
      `저장하면 ${CHECKLIST_TEMPLATES.length}개 할 일이 시기별로 배치돼요`,
    );
  });
});
