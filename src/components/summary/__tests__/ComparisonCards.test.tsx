// [CL-TOP20-P3-SUMMARY-20260703-030000] 비교표 모바일 카드 테스트 — 카드 렌더·최저/최고 표시·총합·'-' 파리티
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ComparisonCards, type ComparisonColumn, type ComparisonRow } from '../ComparisonCards';

const columns: ComparisonColumn[] = [
  { id: 'b1', label: '알뜰형', color: 'hsl(var(--chart-1))' },
  { id: 'b2', label: '프리미엄형', color: 'hsl(var(--chart-2))' },
];

const rows: ComparisonRow[] = [
  { key: 'main-ceremony', label: '본식 운영', icon: '💒', values: [1_000_000, 3_000_000] },
  { key: 'honeymoon', label: '신혼여행', icon: '✈️', values: [0, 5_000_000] },
];

describe('ComparisonCards — 렌더', () => {
  it('행마다 아코디언 카드(트리거)가 렌더되고 첫 카드는 기본 펼침이다', () => {
    render(<ComparisonCards columns={columns} rows={rows} highlightMinMax />);
    expect(screen.getByRole('button', { name: /본식 운영/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /신혼여행/ })).toBeInTheDocument();
    // 첫 행은 defaultValue 로 펼쳐져 예산별 값이 세로로 보인다
    expect(screen.getByText('100만원')).toBeInTheDocument();
    expect(screen.getByText('300만원')).toBeInTheDocument();
  });

  it('최저/최고 배지가 올바른 값 옆에 표시된다 (highlightMinMax)', () => {
    render(<ComparisonCards columns={columns} rows={[rows[0]]} highlightMinMax />);
    const minBadge = screen.getByText('최저');
    const maxBadge = screen.getByText('최고');
    // 배지와 금액이 같은 값 컨테이너 안에 있어야 한다
    expect(within(minBadge.parentElement as HTMLElement).getByText('100만원')).toBeInTheDocument();
    expect(within(maxBadge.parentElement as HTMLElement).getByText('300만원')).toBeInTheDocument();
    // 표와 동일한 색상 클래스 유지
    expect(screen.getByText('100만원').className).toContain('text-green-600');
    expect(screen.getByText('300만원').className).toContain('text-orange-600');
    // 트리거에 격차 요약 노출
    expect(screen.getByText('격차 200만원')).toBeInTheDocument();
  });

  it('highlightMinMax 미지정(분담 표) → 최저/최고 배지 없음', () => {
    render(<ComparisonCards columns={columns} rows={[rows[0]]} />);
    expect(screen.queryByText('최저')).toBeNull();
    expect(screen.queryByText('최고')).toBeNull();
  });

  it('접힌 카드를 클릭하면 펼쳐지고, 0원은 "-" 로 표시된다 (표 파리티)', () => {
    render(<ComparisonCards columns={columns} rows={rows} highlightMinMax />);
    // 두 번째 행(신혼여행)은 접혀 있어 값이 보이지 않는다
    expect(screen.queryByText('500만원')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /신혼여행/ }));
    expect(screen.getByText('500만원')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // 알뜰형 0원 → '-'
  });

  it('동률(전 예산 동일 금액) → 최저/최고 배지를 붙이지 않는다', () => {
    render(
      <ComparisonCards
        columns={columns}
        rows={[{ key: 'tie', label: '동률 카테고리', values: [2_000_000, 2_000_000] }]}
        highlightMinMax
      />,
    );
    expect(screen.queryByText('최저')).toBeNull();
    expect(screen.queryByText('최고')).toBeNull();
    expect(screen.queryByText(/격차/)).toBeNull();
  });

  it('totalRow 가 예산별 총합을 렌더한다', () => {
    render(
      <ComparisonCards
        columns={columns}
        rows={rows}
        highlightMinMax
        totalRow={{ label: '💰 총합', values: [1_000_000, 8_000_000] }}
      />,
    );
    expect(screen.getByText('💰 총합')).toBeInTheDocument();
    expect(screen.getByText('800만원')).toBeInTheDocument();
  });

  it('행도 총합도 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<ComparisonCards columns={columns} rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
