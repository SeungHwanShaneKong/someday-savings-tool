// [CL-POKE-VIS-20260711-173901] PokeNudgeCard — 비모달 넛지: 트리거/상한/억제/모바일 배타/CTA 동작 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
import { PokeNudgeCard } from '../PokeNudgeCard';
import { pokeStorageKey } from '@/lib/collab/poke-logic';
import { pokeNudgeShownKey, pokeNudgeSuppressKey } from '@/lib/collab/poke-nudge';
import { toKSTDateString } from '@/lib/gamification/streak-calc';
import { PWA_INSTALL_DISMISS_KEY } from '@/hooks/usePWAInstall';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// 모바일 분기 제어(기본 데스크톱)
const mobileState = vi.hoisted(() => ({ isMobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobileState.isMobile }));

const PARTNER = { user_id: 'p-1', display_name: '민지', email: 'p@example.com' };
const DAY_MS = 24 * 60 * 60 * 1000;
/** 파트너가 4일 전 마지막 편집(quiet 3일+ 충족) */
const quietItems = [
  { id: 'i1', updated_at: new Date(Date.now() - 4 * DAY_MS).toISOString(), last_edited_by: 'p-1' },
];
const SHOWN_KEY = pokeNudgeShownKey('me-1', toKSTDateString());
const SUPPRESS_KEY = pokeNudgeSuppressKey('me-1');

const baseProps = {
  active: true,
  partner: PARTNER,
  budgetId: 'b1',
  items: quietItems,
  myUserId: 'me-1',
  myEditedThisSession: true,
};

const queryCard = () => screen.queryByRole('complementary', { name: '파트너 콕 찌르기 제안' });

beforeEach(() => {
  localStorage.clear();
  mobileState.isMobile = false;
  vi.mocked(supabase.functions.invoke).mockClear();
  vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { ok: true, sent: true }, error: null } as never);
});

describe('PokeNudgeCard — 노출·상한', () => {
  it('NC.1 트리거 전부 충족 → 카드 렌더 + 일일 키 즉시 기록(노출 기준 상한)', () => {
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    expect(queryCard()).toBeInTheDocument();
    expect(screen.getByText('💌 민지님이 요즘 조용하네요')).toBeInTheDocument();
    expect(localStorage.getItem(SHOWN_KEY)).toBe('1');
  });

  it('NC.2 CTA [콕 찌르기] → invoke 1회 + 카드 소멸(결과는 usePoke 토스트가 담당)', async () => {
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /콕 찌르기/ }));

    await waitFor(() => expect(queryCard()).toBeNull());
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith('notify-partner', {
      body: { budgetId: 'b1', kind: 'poke' },
    });
  });

  it('NC.3 [오늘은 그냥 두기] → 소멸·suppress 무기록·invoke 0회', () => {
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '오늘은 그냥 두기' }));

    expect(queryCard()).toBeNull();
    expect(localStorage.getItem(SUPPRESS_KEY)).toBeNull();
    expect(vi.mocked(supabase.functions.invoke)).not.toHaveBeenCalled();
  });

  it('NC.4 [한 달간 다시 보지 않기] 체크 후 닫기 → suppress 키에 현재 시각 기록', () => {
    const before = Date.now();
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    fireEvent.click(screen.getByRole('checkbox', { name: '한 달간 다시 보지 않기' }));
    fireEvent.click(screen.getByRole('button', { name: '오늘은 그냥 두기' }));

    expect(queryCard()).toBeNull();
    const recorded = Number(localStorage.getItem(SUPPRESS_KEY));
    expect(Number.isFinite(recorded)).toBe(true);
    expect(recorded).toBeGreaterThanOrEqual(before);
  });
});

describe('PokeNudgeCard — 게이트 미충족 시 미렌더', () => {
  it('NC.5 active=false(파트너 부재) → 미렌더', () => {
    renderWithProviders(<PokeNudgeCard {...baseProps} active={false} />);
    expect(queryCard()).toBeNull();
  });

  it('NC.6 내 편집 없음(myEditedThisSession=false) → 미렌더·일일 키 미기록', () => {
    renderWithProviders(<PokeNudgeCard {...baseProps} myEditedThisSession={false} />);
    expect(queryCard()).toBeNull();
    expect(localStorage.getItem(SHOWN_KEY)).toBeNull();
  });

  it('NC.7 파트너가 최근(1일 전) 편집 → quiet 미충족·미렌더', () => {
    const recent = [{ id: 'i1', updated_at: new Date(Date.now() - DAY_MS).toISOString(), last_edited_by: 'p-1' }];
    renderWithProviders(<PokeNudgeCard {...baseProps} items={recent} />);
    expect(queryCard()).toBeNull();
  });

  it('NC.8 쿨다운 중(오늘 이미 찌름) → canPokeNow=false·미렌더', () => {
    localStorage.setItem(pokeStorageKey('me-1', 'p-1'), String(Date.now() - 60_000));
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    expect(queryCard()).toBeNull();
  });

  it('NC.9 오늘(KST) 이미 노출 → 미렌더', () => {
    localStorage.setItem(SHOWN_KEY, '1');
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    expect(queryCard()).toBeNull();
  });

  it('NC.10 30일 억제 중(10일 전 체크) → 미렌더', () => {
    localStorage.setItem(SUPPRESS_KEY, String(Date.now() - 10 * DAY_MS));
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    expect(queryCard()).toBeNull();
  });
});

describe('PokeNudgeCard — InstallPrompt 시간 배타(모바일)', () => {
  it('NC.11 모바일 + PWA 배너 미억제 → 미렌더 + 일일 키 미기록(기회 보존)', () => {
    mobileState.isMobile = true;
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    expect(queryCard()).toBeNull();
    expect(localStorage.getItem(SHOWN_KEY)).toBeNull();
  });

  it('NC.12 모바일 + PWA 배너 억제됨(30일 닫기) → 배타 해제·렌더', () => {
    mobileState.isMobile = true;
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(Date.now()));
    renderWithProviders(<PokeNudgeCard {...baseProps} />);
    expect(queryCard()).toBeInTheDocument();
    expect(localStorage.getItem(SHOWN_KEY)).toBe('1');
  });
});
