// [CL-AUDIT-NICK-ERR-20260622] NicknameDialog — Supabase {error} 시 onSaved 미호출(거짓 저장 방지) 검증
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { NicknameDialog } from '../NicknameDialog';

// profiles.update().eq() 가 주어진 결과로 resolve 하도록 from() 오버라이드
function mockProfilesUpdateResult(result: { data: unknown; error: unknown }) {
  vi.mocked(supabase.from).mockImplementation(((_table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete']) q[m] = vi.fn(() => q);
    q.eq = vi.fn(() => Promise.resolve(result)); // update().eq() 가 종단 await
    (q as { then: unknown }).then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r);
    return q as never;
  }) as never);
}

async function typeAndSave(name: string) {
  fireEvent.change(screen.getByPlaceholderText('예: 신랑'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

describe('NicknameDialog 저장 에러 처리', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('DB 에러({error}) 시 onSaved 를 호출하지 않는다', async () => {
    mockProfilesUpdateResult({ data: null, error: { message: 'rls denied' } });
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    render(<NicknameDialog open onOpenChange={onOpenChange} userId="u1" onSaved={onSaved} />);

    await typeAndSave('신랑');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false)); // finally 에서 닫힘
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('성공({error:null}) 시 onSaved(trimmed) 호출', async () => {
    mockProfilesUpdateResult({ data: {}, error: null });
    const onSaved = vi.fn();
    render(<NicknameDialog open onOpenChange={() => {}} userId="u1" onSaved={onSaved} />);

    await typeAndSave('  신부  ');
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('신부'));
  });
});
