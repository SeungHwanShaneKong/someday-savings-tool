/**
 * [CL-IMPROVE-7TASKS-20260330] 사용자 기능 요청 수집 — Sheet 기반 폼
 * [CL-ADMIN-FEATURE-REQ-20260403] 타입 수정 + 오프라인 큐 + Toss UX 업그레이드
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MessageSquarePlus, Check } from 'lucide-react';

const CATEGORIES = ['예산', '체크리스트', '허니문', 'AI', '기타'] as const;
type Category = (typeof CATEGORIES)[number];

const COOLDOWN_MS = 30_000; // 30초 쿨다운

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [now, setNow] = useState(Date.now());
  const { toast } = useToast();

  const isInCooldown = now < cooldownEnd;

  // 쿨다운 타이머
  useEffect(() => {
    if (!isInCooldown) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isInCooldown]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    const payload = {
      user_id: null as string | null,
      content: content.trim(),
      category: (category ?? null) as string | null,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      payload.user_id = user?.id ?? null;

      const { error } = await (supabase as any)
        .from('feature_requests')
        .insert(payload);

      if (error) throw error;
    } catch {
      // [CL-ADMIN-FEATURE-REQ-20260403] 오프라인 큐 — 실패 시 localStorage 저장
      const queue = JSON.parse(localStorage.getItem('feature_request_queue') || '[]');
      queue.push({ ...payload, queued_at: new Date().toISOString() });
      localStorage.setItem('feature_request_queue', JSON.stringify(queue));
    }

    // 성공/큐 모두 성공 UX 표시
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setOpen(false);
      setContent('');
      setCategory(null);
      setCooldownEnd(Date.now() + COOLDOWN_MS);
      toast({
        title: '소중한 의견 감사합니다!',
        description: '더 나은 웨딩셈을 만드는 데 반영할게요.',
      });
    }, 800);

    setSubmitting(false);
  }, [content, category, submitting, toast]);

  // 글자 수 progress bar 색상
  const charRatio = content.length / 200;
  const charColor = charRatio > 0.9 ? 'bg-red-500' : charRatio > 0.75 ? 'bg-amber-500' : 'bg-green-500';

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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          {/* [CL-ADMIN-FEATURE-REQ-20260403] 성공 애니메이션 */}
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-check-pop">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="toss-title text-green-800">감사합니다!</p>
              <p className="toss-desc mt-1">소중한 의견이 전달되었어요</p>
            </div>
          ) : (
            <>
              <SheetHeader className="text-left mb-4">
                <SheetTitle className="toss-title">
                  어떤 기능이 있으면 좋겠어요?
                </SheetTitle>
                <SheetDescription className="toss-desc">
                  여러분의 의견이 웨딩셈을 더 좋게 만들어요
                </SheetDescription>
              </SheetHeader>

              {/* 카테고리 칩 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(prev => prev === cat ? null : cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-[0.95]',
                      category === cat
                        ? 'bg-primary text-white scale-[1.02]'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 텍스트 입력 */}
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 200))}
                placeholder="예: 예산 엑셀 내보내기, 하객 관리..."
                className="min-h-[100px] rounded-xl resize-none mb-2"
                maxLength={200}
              />

              {/* 글자 수 progress bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', charColor)}
                    style={{ width: `${Math.min(charRatio * 100, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  'text-[11px] font-medium',
                  charRatio > 0.9 ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {content.length}/200
                </span>
              </div>

              {/* 제출 */}
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="toss-cta bg-primary text-white hover:bg-primary/90"
              >
                {submitting ? '보내는 중...' : '보내기'}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
