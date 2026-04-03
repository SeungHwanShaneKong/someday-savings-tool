/**
 * [CL-IMPROVE-7TASKS-20260330] 업데이트 알림 팝업
 * Toss 스타일 다이얼로그 + 자동 닫힘 프로그레스 바
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpdateEntry {
  version: string;
  date: string;
  emoji: string;
  title: string;
  items: { emoji: string; text: string }[];
}

const UPDATE_LOG: UpdateEntry[] = [
  {
    version: '1.1.0',
    date: '2026년 3월 30일',
    emoji: '✨',
    title: '새로운 기능이 추가되었어요',
    items: [
      { emoji: '🏆', text: '허니문 월드컵 16강 확대 — 100개 여행지 랜덤 매칭' },
      { emoji: '🗺️', text: '지도 터치 인터랙션 대폭 개선' },
      { emoji: '💡', text: '의견 보내기 기능 추가' },
      { emoji: '🔗', text: '인앱 브라우저 호환성 강화' },
    ],
  },
];

export function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(100);

  const latest = UPDATE_LOG[0];
  const storageKey = `update_notice_v${latest.version}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;

    const showTimer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(storageKey, '1');
    }, 500);

    return () => clearTimeout(showTimer);
  }, [storageKey]);

  // 자동 닫힘 (8초)
  useEffect(() => {
    if (!open) return;
    const duration = 8000;
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
      if (elapsed >= duration) {
        setOpen(false);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [open]);

  if (!latest) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border-0 [&>button]:hidden">
        <DialogTitle className="sr-only">업데이트 알림</DialogTitle>
        <DialogDescription className="sr-only">
          {/* [CL-PREVIEW-SYNC-20260403-120830] Radix Dialog 접근성 경고 제거용 설명 */}
          최근 업데이트된 기능 안내와 확인 버튼을 제공하는 알림입니다.
        </DialogDescription>
        {/* 자동 닫힘 프로그레스 바 */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary/60 ease-linear"
            style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
          />
        </div>

        <div className="p-6">
          {/* 헤더 */}
          <div className="text-center mb-5">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">{latest.emoji}</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {latest.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              v{latest.version} · {latest.date}
            </p>
          </div>

          {/* 업데이트 항목 */}
          <div className="space-y-3 mb-6">
            {latest.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0 mt-0.5">{item.emoji}</span>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={() => setOpen(false)}
            className="toss-cta bg-primary text-white hover:bg-primary/90"
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
