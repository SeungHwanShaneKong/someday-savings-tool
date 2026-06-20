// [CL-COEDIT-E2E-20260620-130000] CollaboratorManager — 초대 발급·오너 게이팅
import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CollaboratorManager } from '../CollaboratorManager';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));

// per-file supabase override: 초대 insert 가 token 반환, 협업자 목록은 빈 배열
vi.mock('@/integrations/supabase/client', () => {
  const supabase = {
    from: () => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.insert = () => b;
      b.delete = () => b;
      b.single = async () => ({ data: { token: 'tok_abcdef0123456789' }, error: null });
      b.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return b;
    },
  };
  return { supabase };
});

describe('CollaboratorManager', () => {
  it('CM.1 오너 — 초대 버튼 표시 + 클릭 시 초대 링크 발급', async () => {
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={true} />);
    expect(screen.getByText('파트너와 공동관리')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /파트너 초대 링크 만들기/ });
    fireEvent.click(btn);
    expect(await screen.findByText(/\/invite\/tok_abcdef/)).toBeInTheDocument();
  });

  it('CM.2 비오너 — 초대 버튼 없음(권한 게이팅)', () => {
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={false} />);
    expect(screen.getByText('파트너와 공동관리')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /파트너 초대 링크 만들기/ })).toBeNull();
  });

  // [CL-COEDIT-INVITE-DISCOVER-20260620] autoInvite 자동 초대(발견성 개선 바로가기) — MECE 매트릭스
  it('CM.3 autoInvite + 오너 + budgetId → 클릭 없이 초대 링크 자동 생성 + onAutoInviteHandled 1회', async () => {
    const handled = vi.fn();
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={true} autoInvite onAutoInviteHandled={handled} />,
    );
    expect(await screen.findByText(/\/invite\/tok_abcdef/)).toBeInTheDocument();
    expect(handled).toHaveBeenCalledTimes(1);
  });

  it('CM.4 autoInvite + budgetId=null → 자동 생성 안 함(예산 가드)', () => {
    const handled = vi.fn();
    renderWithProviders(
      <CollaboratorManager budgetId={null} isOwner={true} autoInvite onAutoInviteHandled={handled} />,
    );
    expect(screen.queryByText(/\/invite\//)).toBeNull();
    expect(handled).not.toHaveBeenCalled();
  });

  it('CM.5 autoInvite + 비오너 → 자동 생성 안 함(소유자 한정)', () => {
    const handled = vi.fn();
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={false} autoInvite onAutoInviteHandled={handled} />,
    );
    expect(screen.queryByText(/\/invite\//)).toBeNull();
    expect(handled).not.toHaveBeenCalled();
  });

  it('CM.6 autoInvite=false + 오너 + budgetId → 자동 생성 안 함(수동 버튼만 노출)', () => {
    const handled = vi.fn();
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={true} autoInvite={false} onAutoInviteHandled={handled} />,
    );
    expect(screen.queryByText(/\/invite\//)).toBeNull();
    expect(screen.getByRole('button', { name: /파트너 초대 링크 만들기/ })).toBeInTheDocument();
    expect(handled).not.toHaveBeenCalled();
  });
});
