// [CL-TOP20-P4-COLLAB-20260703-040000] PartnerActivityChip — 파트너 최근 활동 칩(2분 창) 계약 검증.
//  fake timers + setSystemTime 으로 결정론: 노출/만료 숨김/내 편집 제외/비활성/이름 폴백/실시간 재노출.
//  라우터·Supabase 비의존(순수 props) → 단독 render.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { PartnerActivityChip, PARTNER_ACTIVITY_WINDOW_MS } from '../PartnerActivityChip';
import type { HasIdUpdated } from '@/lib/collab/changed-since';

const BASE = Date.parse('2026-07-03T04:00:00.000Z');
const isoAgo = (ms: number) => new Date(BASE - ms).toISOString();
const partnerItem = (msAgo: number, over: Partial<HasIdUpdated> = {}): HasIdUpdated => ({
  id: 'it-1',
  updated_at: isoAgo(msAgo),
  last_edited_by: 'partner',
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE);
});
afterEach(() => {
  cleanup(); // 타이머 원복 전에 언마운트(effect cleanup 이 fake 타이머 clear)
  vi.useRealTimers();
});

describe('PartnerActivityChip — 파트너 최근 활동 칩(2분)', () => {
  it('PC.1 파트너가 30초 전 편집 → 칩 노출("{이름}님이 방금 편집했어요")', () => {
    render(
      <PartnerActivityChip items={[partnerItem(30_000)]} myUserId="me" partnerName="지윤" active />,
    );
    expect(screen.getByText(/지윤님이 방금 편집했어요/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // SR 공지(aria-live polite)
  });

  it('PC.2 2분 창 만료(잔여 90초 경과) → 칩 자동 숨김(fake timers)', () => {
    render(
      <PartnerActivityChip items={[partnerItem(30_000)]} myUserId="me" partnerName="지윤" active />,
    );
    expect(screen.getByText(/방금 편집했어요/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(PARTNER_ACTIVITY_WINDOW_MS - 30_000 + 1); // 잔여 90초 + 1ms
    });
    expect(screen.queryByText(/방금 편집했어요/)).toBeNull();
  });

  it('PC.3 이미 2분 넘게 지난 편집(150초 전) → 처음부터 미노출', () => {
    render(
      <PartnerActivityChip items={[partnerItem(150_000)]} myUserId="me" partnerName="지윤" active />,
    );
    expect(screen.queryByText(/방금 편집했어요/)).toBeNull();
  });

  it('PC.4 내 편집(last_edited_by===myUserId)·편집자 미상(null)은 제외 → 미노출', () => {
    render(
      <PartnerActivityChip
        items={[partnerItem(10_000, { last_edited_by: 'me' }), partnerItem(10_000, { id: 'it-2', last_edited_by: null })]}
        myUserId="me"
        partnerName="지윤"
        active
      />,
    );
    expect(screen.queryByText(/방금 편집했어요/)).toBeNull();
  });

  it('PC.5 active=false(개인 모드/무파트너) → 최근 편집이 있어도 미노출', () => {
    render(
      <PartnerActivityChip items={[partnerItem(10_000)]} myUserId="me" partnerName="지윤" active={false} />,
    );
    expect(screen.queryByText(/방금 편집했어요/)).toBeNull();
  });

  it('PC.6 파트너 이름 없음/공백 → "파트너님이 방금 편집했어요" 폴백', () => {
    render(
      <PartnerActivityChip items={[partnerItem(10_000)]} myUserId="me" partnerName="   " active />,
    );
    expect(screen.getByText(/파트너님이 방금 편집했어요/)).toBeInTheDocument();
  });

  it('PC.7 실시간 갱신(오래된 items → 새 편집 도착 rerender) → 칩 재노출', () => {
    const { rerender } = render(
      <PartnerActivityChip items={[partnerItem(300_000)]} myUserId="me" partnerName="지윤" active />,
    );
    expect(screen.queryByText(/방금 편집했어요/)).toBeNull();
    rerender(
      <PartnerActivityChip items={[partnerItem(300_000), partnerItem(0, { id: 'it-new' })]} myUserId="me" partnerName="지윤" active />,
    );
    expect(screen.getByText(/지윤님이 방금 편집했어요/)).toBeInTheDocument();
  });

  it('PC.8 미래 updated_at(시계 스큐) → 노출은 하되 최대 2분으로 클램프', () => {
    render(
      <PartnerActivityChip items={[partnerItem(-600_000)]} myUserId="me" partnerName="지윤" active />,
    );
    expect(screen.getByText(/방금 편집했어요/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(PARTNER_ACTIVITY_WINDOW_MS + 1); // 클램프 상한 경과
    });
    expect(screen.queryByText(/방금 편집했어요/)).toBeNull();
  });
});
