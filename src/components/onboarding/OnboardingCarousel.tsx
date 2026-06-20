// [CL-ONBOARDING-20260619-222424] 첫 방문 온보딩 캐러셀 (클라 전용 모달 — 프리렌더 무영향)
// '/'(홈) 최초 방문에만 600ms 후 표시 → 닫으면 버전 키 저장으로 재표시 안 함.
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ONBOARDING_SLIDES } from './onboarding-slides';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';

export function OnboardingCarousel() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const count = ONBOARDING_SLIDES.length;

  // 홈 최초 방문 게이팅 (LCP 히어로가 먼저 그려지도록 600ms 지연)
  useEffect(() => {
    if (pathname !== '/') return;
    if (hasSeenOnboarding()) return;
    const t = setTimeout(() => {
      setOpen(true);
      markOnboardingSeen(); // 표시 즉시 기록 → 새로고침/강제종료해도 재노출 안 함
    }, 600);
    return () => clearTimeout(t);
  }, [pathname]);

  // embla 선택 동기화 (실브라우저). jsdom 등 레이아웃 없을 땐 아래 낙관적 setCurrent 가 진행 담당.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    onSelect();
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const goTo = useCallback(
    (i: number) => {
      api?.scrollTo(i);
      setCurrent(i);
    },
    [api],
  );

  const isLast = current >= count - 1;

  const finish = useCallback(() => {
    setOpen(false);
    navigate(user ? '/budget' : '/auth');
  }, [navigate, user]);

  const handleNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    // [CL-DBSWITCH-VERIFY-20260620] 절대 인덱스 이동 — 실브라우저에서 embla 'select' 가 setCurrent(snap) 을
    //   호출하므로, 낙관적 c+1 과 합쳐지면 도트가 2칸 증가(마지막 슬라이드 스킵·조기 '시작하기')하는 버그.
    //   goTo 와 동일하게 절대 next 로 통일 → select 와 같은 값으로 수렴(이중증가 0). jsdom 은 setCurrent 가 진행 담당.
    const next = Math.min(current + 1, count - 1);
    api?.scrollTo(next);
    setCurrent(next);
  }, [isLast, finish, api, current, count]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border-0 [&>button]:hidden">
        <DialogTitle className="sr-only">웨딩셈 기능 안내</DialogTitle>
        <DialogDescription className="sr-only">
          웨딩셈의 주요 기능을 슬라이드로 소개하는 온보딩 안내입니다.
        </DialogDescription>

        {/* 건너뛰기 */}
        <div className="flex justify-end px-4 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            건너뛰기
          </Button>
        </div>

        {/* [CL-DBSWITCH-VERIFY-20260620] min-w-0: DialogContent(grid) 셀 안에서 carousel 그리드아이템의
            min-width:auto 가 6슬라이드 min-content 폭(~944px)으로 팽창해 슬라이드가 화면 밖으로 밀리던 버그 수정.
            → 모바일/데스크톱 모두 슬라이드가 다이얼로그 폭(max-w-sm)에 정확히 맞음. */}
        <Carousel setApi={setApi} opts={{ loop: false }} className="w-full min-w-0">
          <CarouselContent>
            {ONBOARDING_SLIDES.map((slide) => {
              const Icon = slide.icon;
              return (
                <CarouselItem key={slide.id}>
                  <div className="flex flex-col items-center px-8 pb-2 pt-4 text-center">
                    <div
                      className={cn(
                        'mb-6 flex h-20 w-20 items-center justify-center rounded-2xl',
                        slide.ringClass,
                      )}
                    >
                      <Icon className={cn('h-10 w-10', slide.iconClass)} aria-hidden="true" />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-foreground">{slide.title}</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">{slide.description}</p>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {/* 도트 인디케이터 */}
        <div className="flex justify-center gap-2 py-4">
          {ONBOARDING_SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}번째 슬라이드로 이동`}
              aria-current={current === i}
              className={cn(
                'h-2 rounded-full transition-all',
                current === i ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        <div className="px-6 pb-6">
          <Button onClick={handleNext} className="h-12 w-full text-base font-semibold">
            {isLast ? '시작하기' : '다음으로'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
