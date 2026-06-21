// [CL-ANIM-UPGRADE-20260621-150000] 표준 토스트 헬퍼 — 이모지 + variant 일관화
// 기존 use-toast(Radix 기반 reducer)를 래핑. 신규 호출부에서 톤을 통일하기 위함.
import type { ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

type ToastBody = { description?: ReactNode };

/** 성공 피드백 (✅) */
export function toastSuccess(title: string, opts?: ToastBody) {
  return toast({ title: `✅ ${title}`, description: opts?.description });
}

/** 오류 피드백 (❌, destructive) */
export function toastError(title: string, opts?: ToastBody) {
  return toast({ title: `❌ ${title}`, description: opts?.description, variant: 'destructive' });
}

/** 희소한 성취 축하 (🎉) — 완료 등 큰 순간에만 */
export function toastCelebrate(title: string, opts?: ToastBody) {
  return toast({ title: `🎉 ${title}`, description: opts?.description });
}
