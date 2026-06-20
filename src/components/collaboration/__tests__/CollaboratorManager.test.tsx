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
});
