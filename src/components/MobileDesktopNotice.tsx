import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor } from 'lucide-react';
// [CL-TOP20-R50-UI-20260703-094000] 날짜 키 UTC→KST 통일 — 기존 KST 헬퍼 재사용(자정 경계 오표시 방지)
import { toKSTDateString } from '@/lib/gamification/streak-calc';

export function MobileDesktopNotice() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // 태블릿 포함 모바일 감지 (width < 1024)
    const isMobileOrTablet = window.innerWidth < 1024;
    if (!isMobileOrTablet) return;

    // [CL-TOP20-R50-UI-20260703-094000] KST 기준 YYYY-MM-DD (UTC toISOString 은 한국 아침 9시 전 '어제'로 판정됐음)
    const today = toKSTDateString();
    const key = `desktop_notice_${user.id}_${today}`;

    if (localStorage.getItem(key)) return;

    // 약간 지연 후 표시 (로그인 직후 자연스럽게)
    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(key, '1');
    }, 800);

    return () => clearTimeout(timer);
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-base">안내</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            데스크톱 환경에서 가장 편리하게 보실 수 있어요^^
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => setOpen(false)} className="w-full mt-2">
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );
}
