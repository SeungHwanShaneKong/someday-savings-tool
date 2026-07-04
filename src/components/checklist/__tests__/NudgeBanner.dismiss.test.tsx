// [CL-BTNAUDIT3-20260704 | 닫기 a11y] NudgeBanner 닫기(X) 버튼 — 접근명 조회 + dismiss 동작
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NudgeBanner } from '../NudgeBanner';

describe('NudgeBanner — 닫기 버튼 접근성', () => {
  it('D1 닫기 버튼이 aria-label("안내 닫기")로 조회된다', () => {
    render(<NudgeBanner type="no-dday" />);
    const closeBtn = screen.getByRole('button', { name: '안내 닫기' });
    expect(closeBtn).toBeInTheDocument();
    // 네이티브 버튼 계약: type="button" (폼 서밋 오작동 방지)
    expect(closeBtn).toHaveAttribute('type', 'button');
  });

  it('D2 닫기 버튼 클릭 → 배너가 즉시 사라진다(dismiss)', () => {
    const { container } = render(
      <NudgeBanner type="incomplete" onAction={vi.fn()} actionLabel="이어서 하기" />,
    );
    // 액션 버튼이 보이는 상태(배너 렌더 확인)
    expect(
      screen.getByRole('button', { name: /이어서 하기/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '안내 닫기' }));

    // dismissed → null 렌더(컨테이너 비움)
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: '안내 닫기' })).toBeNull();
  });
});
