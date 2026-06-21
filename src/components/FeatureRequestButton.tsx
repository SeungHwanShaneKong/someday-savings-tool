/**
 * [CL-IMPROVE-7TASKS-20260330] 사용자 기능 요청 수집 — Footer 트리거 버튼
 * [CL-ADMIN-FEATURE-REQ-20260403] 오프라인 큐 + Toss UX
 * [CL-FEEDBACK-DAILY-20260621] Sheet/폼은 FeatureRequestSheet 로 추출(일1회 토스트와 공유). 여기선 버튼+쿨다운만.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquarePlus } from 'lucide-react';
import { FeatureRequestSheet } from './FeatureRequestSheet';

const COOLDOWN_MS = 30_000; // 30초 쿨다운

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [now, setNow] = useState(Date.now());

  const isInCooldown = now < cooldownEnd;

  // 쿨다운 타이머
  useEffect(() => {
    if (!isInCooldown) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isInCooldown]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isInCooldown}
        className={cn(
          'text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1',
          isInCooldown && 'opacity-50 cursor-not-allowed'
        )}
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        {isInCooldown
          ? `${Math.ceil((cooldownEnd - now) / 1000)}초 후 가능`
          : '의견 보내기'}
      </button>

      <FeatureRequestSheet
        open={open}
        onOpenChange={setOpen}
        onSubmitted={() => setCooldownEnd(Date.now() + COOLDOWN_MS)}
      />
    </>
  );
}
