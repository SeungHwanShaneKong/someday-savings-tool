/**
 * [CL-IMPROVE-7TASKS-20260330] 사용자 기능 요청 수집 — Sheet 기반 폼
 */

import { useState } from 'react';
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
import { MessageSquarePlus } from 'lucide-react';

const CATEGORIES = ['예산', '체크리스트', '허니문', 'AI', '기타'] as const;
type Category = (typeof CATEGORIES)[number];

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(() => sessionStorage.getItem('feature_request_sent') === '1');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('feature_requests')
        .insert({
          user_id: user?.id ?? null,
          content: content.trim(),
          category: category ?? null,
        });

      if (error) throw error;

      sessionStorage.setItem('feature_request_sent', '1');
      setSubmitted(true);
      setOpen(false);
      setContent('');
      setCategory(null);

      toast({
        title: '소중한 의견 감사합니다!',
        description: '더 나은 웨딩셈을 만드는 데 반영할게요.',
      });
    } catch {
      toast({
        title: '전송 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        의견 보내기
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
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
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                  category === cat
                    ? 'bg-primary text-white'
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
          <p className="text-[11px] text-muted-foreground text-right mb-4">
            {content.length}/200
          </p>

          {/* 제출 */}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting || submitted}
            className="toss-cta bg-primary text-white hover:bg-primary/90"
          >
            {submitted ? '이미 보냈어요' : submitting ? '보내는 중...' : '보내기'}
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
