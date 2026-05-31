/** [CL-QA100-BTN-20260531] 컴포넌트 상호작용 검증 — CoffeeDonationModal / CoffeeDonationFab */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CoffeeDonationModal, CoffeeDonationFab } from '../CoffeeDonationModal';

// useIsMobile: default desktop (false)
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

// mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe('CoffeeDonationModal', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    vi.mocked(navigator.clipboard.writeText).mockClear();
  });

  it('CD.1: open=true → 다이얼로그 타이틀 렌더', () => {
    renderWithProviders(<CoffeeDonationModal open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText(/개발자에게 따뜻한 커피 한 잔/)).toBeInTheDocument();
  });

  it('CD.2: open=false → 다이얼로그 미표시', () => {
    renderWithProviders(<CoffeeDonationModal open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText(/개발자에게 따뜻한 커피 한 잔/)).toBeNull();
  });

  it('CD.3: 프리셋 3개 버튼 표시 (아메리카노, 케이크 세트, 든든한 한 끼)', () => {
    renderWithProviders(<CoffeeDonationModal open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText('아메리카노')).toBeInTheDocument();
    expect(screen.getByText('케이크 세트')).toBeInTheDocument();
    expect(screen.getByText('든든한 한 끼')).toBeInTheDocument();
  });

  it('CD.4: 데스크톱 → "계좌번호 복사 후 이체하기" CTA 버튼 표시', () => {
    renderWithProviders(<CoffeeDonationModal open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText('계좌번호 복사 후 이체하기')).toBeInTheDocument();
  });

  it('CD.5: 계좌번호 복사 버튼 클릭 → clipboard.writeText 호출', async () => {
    renderWithProviders(<CoffeeDonationModal open={true} onOpenChange={onOpenChange} />);
    const copyBtn = screen.getByText('계좌번호 복사 후 이체하기').closest('button')!;
    fireEvent.click(copyBtn);
    // clipboard.writeText should have been called with the account number
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('3333206517167');
  });

  it('CD.6: 계좌 정보 strip에 계좌번호 표시', () => {
    renderWithProviders(<CoffeeDonationModal open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText(/3333206517167/)).toBeInTheDocument();
  });
});

describe('CoffeeDonationFab', () => {
  it('CD.7: FAB 렌더 + 커피 한잔 텍스트 표시', () => {
    const onClick = vi.fn();
    render(<CoffeeDonationFab onClick={onClick} />);
    expect(screen.getByText('커피 한잔')).toBeInTheDocument();
  });

  it('CD.8: FAB 클릭 → onClick 콜백 호출', () => {
    const onClick = vi.fn();
    render(<CoffeeDonationFab onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: '개발자에게 커피 후원하기' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
