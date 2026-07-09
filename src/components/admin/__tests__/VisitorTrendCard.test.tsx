// [CL-ADMIN-VISITOR-20260709-231827] VisitorTrendCard 텍스트 수준 스모크 — 제목·요약·각주·폴백 분기.
//   주의: jsdom 에서 Recharts ResponsiveContainer 는 width 0 으로 렌더 → SVG 내부(시리즈/축) 단언 금지(계약).
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { VisitorTrendCard, type VisitorTrendCardPoint } from '@/components/admin/VisitorTrendCard';

const points: VisitorTrendCardPoint[] = [
  { date: '7/1', anonSessions: 5, loginUsers: 5, total: 10, loginRatio: 50, totalMA7: null },
  { date: '7/2', anonSessions: 3, loginUsers: 7, total: 10, loginRatio: 70, totalMA7: null },
];

describe('VisitorTrendCard — 일별 접속자(추정) 카드', () => {
  it('제목·기간 요약(합계 20 · 로그인 비율 60%)·각주를 렌더한다', () => {
    renderWithProviders(<VisitorTrendCard points={points} anonAvailable={true} />);

    expect(screen.getByText('일별 접속자 (추정)')).toBeInTheDocument();
    // 요약: totalSum=20, loginSum=12 → 60%
    expect(screen.getByText(/접속 20 · 로그인 비율 60%/)).toBeInTheDocument();
    // 각주(추정 근거 고지)
    expect(
      screen.getByText(/익명=세션 수·로그인=사용자 수 기준 합산 추정/),
    ).toBeInTheDocument();
    // anonAvailable=true 면 '데이터 없음' 안내가 없어야 한다
    expect(screen.queryByText(/익명 방문 데이터 없음/)).not.toBeInTheDocument();
  });

  it('anonAvailable=false → 익명 데이터 없음 안내를 표시(로그인 기준 차트는 유지)', () => {
    renderWithProviders(<VisitorTrendCard points={points} anonAvailable={false} />);

    expect(screen.getByText('일별 접속자 (추정)')).toBeInTheDocument();
    expect(screen.getByText(/익명 방문 데이터 없음/)).toBeInTheDocument();
  });

  it('points 비어 있음 → 빈 상태 문구(차트 대신)', () => {
    renderWithProviders(<VisitorTrendCard points={[]} anonAvailable={false} />);

    expect(screen.getByText('아직 접속자 데이터가 없어요.')).toBeInTheDocument();
    // 빈 상태에선 '익명 방문 데이터 없음' 인라인 안내도 생략(이중 안내 방지)
    expect(screen.queryByText(/익명 방문 데이터 없음/)).not.toBeInTheDocument();
  });

  it('total 전부 0 → 요약에 로그인 비율을 표시하지 않는다(0% 오도 금지)', () => {
    const zero: VisitorTrendCardPoint[] = [
      { date: '7/1', anonSessions: 0, loginUsers: 0, total: 0, loginRatio: null, totalMA7: null },
    ];
    renderWithProviders(<VisitorTrendCard points={zero} anonAvailable={false} />);

    expect(screen.getByText(/접속 0/)).toBeInTheDocument();
    expect(screen.queryByText(/로그인 비율/)).not.toBeInTheDocument();
  });
});
