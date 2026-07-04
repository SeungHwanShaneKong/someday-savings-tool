/**
 * [CL-FEEDBACK-DAILY-20260621] 기능 요청 Sheet — Footer 버튼과 일1회 토스트가 공유하는 controlled 모달.
 * (기존 FeatureRequestButton 의 Sheet+폼+제출 로직을 추출. 제출=feature_requests insert + 오프라인 큐 폴백.)
 */
import { useState, useCallback, useRef } from 'react';
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
import { Check } from 'lucide-react';

export const FEATURE_CATEGORIES = ['예산', '체크리스트', '허니문', 'AI', '기타'] as const;
type Category = (typeof FEATURE_CATEGORIES)[number];

interface FeatureRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 제출 완료 시 호출(예: 트리거 측 쿨다운 설정) */
  onSubmitted?: () => void;
}

export function FeatureRequestSheet({ open, onOpenChange, onSubmitted }: FeatureRequestSheetProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  // [CL-BTNAUDIT3-20260704 | 동기 게이트] submitting(state)만으로는 getUser() await 창에서
  //   두 번째 클릭이 클로저 stale(submitting=false)을 읽어 재진입 → feature_requests INSERT 2회.
  //   ref 는 리렌더 이전(같은 틱)에 즉시 반영되므로 동기 차단으로 중복 제출을 원천 봉쇄한다.
  const inFlight = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;
    // [CL-BTNAUDIT3-20260704 | 재진입차단] 동기 ref 게이트 — state 갱신을 기다리지 않고 같은 틱 재진입 차단.
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);

    const payload = {
      user_id: null as string | null,
      content: content.trim(),
      category: (category ?? null) as string | null,
    };

    try {
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

      // 성공/큐 모두 성공 UX 표시 (성공 화면 유지 동안 submitting=true 로 버튼 계속 비활성)
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
        setContent('');
        setCategory(null);
        setSubmitting(false);
        onSubmitted?.();
        toast({
          title: '소중한 의견 감사합니다!',
          description: '더 나은 웨딩셈을 만드는 데 반영할게요.',
        });
      }, 800);
    } finally {
      // [CL-BTNAUDIT3-20260704 | 게이트해제] 제출 라이프사이클 종료 시 게이트 해제(다음 제출 허용).
      //   성공 화면은 별도 submitting=true 로 비활성 유지 → 게이트 해제와 버튼 비활성은 독립.
      inFlight.current = false;
    }
  }, [content, category, toast, onOpenChange, onSubmitted]);

  // 글자 수 progress bar 색상
  const charRatio = content.length / 200;
  const charColor = charRatio > 0.9 ? 'bg-red-500' : charRatio > 0.75 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
              {FEATURE_CATEGORIES.map((cat) => (
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
  );
}
