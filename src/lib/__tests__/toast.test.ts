// [CL-ANIM-UPGRADE-20260621-150000] 토스트 헬퍼 단위 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { toast } from '@/hooks/use-toast';
import { toastSuccess, toastError, toastCelebrate } from '../toast';

describe('toast helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toastSuccess 는 ✅ 를 붙인다', () => {
    toastSuccess('저장됨', { description: 'ok' });
    expect(toast).toHaveBeenCalledWith({ title: '✅ 저장됨', description: 'ok' });
  });

  it('toastError 는 ❌ + destructive', () => {
    toastError('실패');
    expect(toast).toHaveBeenCalledWith({
      title: '❌ 실패',
      description: undefined,
      variant: 'destructive',
    });
  });

  it('toastCelebrate 는 🎉 를 붙인다', () => {
    toastCelebrate('완료');
    expect(toast).toHaveBeenCalledWith({ title: '🎉 완료', description: undefined });
  });
});
