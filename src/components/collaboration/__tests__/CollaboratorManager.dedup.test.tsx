// [CL-AUDIT-RPC-DEDUP-20260622] CollaboratorManager — external 주입 시 내부 useCollaboration 이
//   get_budget_participants RPC 를 호출하지 않음(중복 RPC 제거) 검증. (useCollaboration 은 실제 훅 사용)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
import { CollaboratorManager } from '@/components/collaboration/CollaboratorManager';
import type { UseCollaborationResult } from '@/hooks/useCollaboration';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const externalStub: UseCollaborationResult = {
  collaborators: [{ user_id: 'p1', role: 'editor', display_name: '신부', isMe: false }],
  inviteUrl: null,
  busy: false,
  createInvite: vi.fn(async () => null),
  removeCollaborator: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
};

beforeEach(() => {
  vi.mocked(supabase.rpc).mockClear();
});

describe('CollaboratorManager RPC 중복 제거', () => {
  it('external 주입 시 get_budget_participants RPC 미호출(내부 훅은 null 로 비활성)', async () => {
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner external={externalStub} />);
    await Promise.resolve(); // refresh effect 기회 부여
    const calls = vi.mocked(supabase.rpc).mock.calls.filter((c) => c[0] === 'get_budget_participants');
    expect(calls.length).toBe(0);
  });
});
