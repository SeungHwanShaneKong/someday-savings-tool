import { useState, useEffect, useCallback, forwardRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// [CL-ADSENSE-CONTENT-20260630] 홈 콘텐츠화 — 인기 가이드 카드용 아티클 레지스트리
import { ARTICLES } from '@/content/articles';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  Sparkles,
  Calculator,
  CalendarCheck,
  Brain,
  MapPin,
  MessageCircle,
  Gift, // [CL-GIFT-CARD-20260418-240000]
  BarChart3, // [CL-TOP20-P2-HUB-20260703-022500]
  UserRound, // [CL-TOP20-P2-HUB-20260703-022500]
  ArrowRight, // [CL-TOP20-P2-HUB-20260703-022500]
} from 'lucide-react';
// [CL-TOP20-P2-HUB-20260703-022500] 로그인 홈 허브(Top20 #9) — D-day 카운트다운(자체 페치·무props)
import { WeddingCountdown } from '@/components/WeddingCountdown';
// [CL-TOP20-P4-GAMIFY-20260703-044500] 다음 방문 이유 카드(Top20 #18) — useStreak 값 주입형
import { NextMilestoneCard } from '@/components/gamification/NextMilestoneCard';
import Footer from '@/components/Footer';
import type { LucideIcon } from 'lucide-react';
import {
  getBrowserInfo,
  openInExternalBrowserWithFallback,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';
import { useSEO } from '@/hooks/useSEO';
import { EXTERNAL_URLS, openExternalLink } from '@/lib/external-links'; // [CL-GIFT-CARD-20260418-240000]
// [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 이동 로딩 UX
import { AIExternalNavigationOverlay } from '@/components/AIExternalNavigationOverlay';
import { useAIExternalNavigation } from '@/hooks/useAIExternalNavigation';
// [CL-GAMIFY-INT-20260418-222329] 로그인 streak 노출
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { useStreak } from '@/hooks/useStreak';
// [CL-TOP20-P1-LANDING-20260703-014500] Top20 P1 방문자 대도약 — 웨딩 마크·챗 프리뷰·신뢰 섹션·퍼널 계측
import { WeddingMark } from '@/components/landing/WeddingMark';
// [CL-LOGIN-GATE-20260709-233447] 시뮬레이터/데모 폐지 → 직접 Google 로그인 가입 카드
import { HeroSignupCard } from '@/components/landing/HeroSignupCard';
import { ChatPreview } from '@/components/landing/ChatPreview';
import TrustSection from '@/components/landing/TrustSection';
import { trackFunnel } from '@/lib/analytics/funnel-events';
import { InstallAppButton } from '@/components/install/InstallAppButton'; // [CL-PWA-A2HS-20260706-202700] 히어로 설치 CTA

/* ─── Feature Data ─── */
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  isAI: boolean;
  gradient: string;
  iconColor: string;
  link?: string;
  externalLink?: string; // [CL-HONEYMOON-EXTERNAL-20260416-221500]
  // [CL-AI-EXTNAV-OVERLAY-20260418-205622] 존재 시 외부 이동 전 AI 로딩 오버레이 노출
  aiLoadingTitle?: string;
  // [CL-TOP20-P1-LANDING-20260703-014500] 카드 위계(Top20 #5): high=주력 3종(대형), sub=특화 3종(컴팩트)
  priority: 'high' | 'sub';
}

// [CL-GIFT-CARD-20260418-240000] 6개 카드 + [CL-TOP20-P1-LANDING-20260703-014500] 3+3 위계(Top20 #5):
// 주력(high) = 코어 루프 3종(예산·체크리스트·챗) 대형 카드 / 특화(sub) = 확장 3종 컴팩트 카드.
const FEATURES: Feature[] = [
  {
    icon: Calculator,
    title: '예산 시뮬레이터',
    description: '카테고리별 비용 입력 → 평균과 비교 분석',
    isAI: false,
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'text-blue-500',
    link: '/budget',
    priority: 'high',
  },
  {
    icon: CalendarCheck,
    title: 'D-day 체크리스트 AI',
    description: '결혼일 기준 AI 자동 생성 시기별 준비 리스트',
    isAI: true,
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconColor: 'text-emerald-500',
    link: '/checklist',
    priority: 'high',
  },
  {
    icon: MessageCircle,
    title: 'AI Q&A 챗봇',
    description: '결혼 준비 궁금증, AI에게 실시간 질문',
    isAI: true,
    gradient: 'from-rose-500/10 to-rose-600/5',
    iconColor: 'text-rose-500',
    link: '/chat',
    priority: 'high',
  },
  {
    icon: Gift,
    title: '선물 추천 AI',
    description: 'AI 기반 맞춤 선물 추천 + 예산별 큐레이션',
    isAI: true,
    gradient: 'from-pink-500/10 to-pink-600/5',
    iconColor: 'text-pink-500',
    externalLink: EXTERNAL_URLS.gift,
    aiLoadingTitle: 'AI가 완벽한 선물을 찾고 있어요', // [CL-AI-EXTNAV-OVERLAY-20260418-205622]
    priority: 'sub',
  },
  {
    icon: MapPin,
    title: 'AI 허니문 큐레이션',
    description: '취향 맞춤 여행지 AI 추천 + 지도 비교',
    isAI: true,
    gradient: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'text-amber-500',
    externalLink: EXTERNAL_URLS.honeymoon,
    aiLoadingTitle: 'AI가 맞춤 여행지를 큐레이션하고 있어요', // [CL-AI-EXTNAV-OVERLAY-20260418-205622]
    priority: 'sub',
  },
  {
    icon: Brain,
    title: 'AI 비용 인사이트',
    description: '숨겨진 비용 경고 + 절약 팁 실시간 추천',
    isAI: true,
    gradient: 'from-violet-500/10 to-violet-600/5',
    iconColor: 'text-violet-500',
    link: '/budget',
    priority: 'sub',
  },
];

/* ─── Landing Page ─── */
export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useSEO({
    title: '웨딩셈 - 결혼 예산 계산기, 결혼 비용 계산기',
    description: '결혼 준비의 시작, 결혼 예산 관리부터 결혼 체크 리스트까지 스마트하게! 웨딩셈으로 복잡한 결혼 비용을 항목별로 깔끔하게 정리하세요. 스드메, 식대, 혼수까지 실시간 계산.',
    path: '/',
  });
  const [browserInfo] = useState(() => getBrowserInfo());
  const [showBridgeUI, setShowBridgeUI] = useState(false);
  const [copied, setCopied] = useState(false);

  // [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 카드 이동 대기 UX
  const { overlayProps, startNavigation } = useAIExternalNavigation();

  // [CL-GAMIFY-INT-20260418-222329] 로그인 streak 계산 (인증 시에만 활성화)
  const streak = useStreak();

  // 랜딩 페이지 진입 시 인앱 브라우저 감지 → 다중 탈출 전략 실행
  useEffect(() => {
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowserWithFallback(
        window.location.href,
        () => setShowBridgeUI(true)
      );
    }
  }, [browserInfo.isInAppBrowser]);

  // [CL-AI-EXTNAV-OVERLAY-20260418-205622] 외부 AI 도메인 preconnect → 실제 이동 지연 200~400ms 단축
  useEffect(() => {
    const origins = [EXTERNAL_URLS.gift, EXTERNAL_URLS.honeymoon];
    const appended: HTMLLinkElement[] = [];
    origins.forEach((url) => {
      try {
        const origin = new URL(url).origin;
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        appended.push(link);
      } catch {
        // URL 파싱 실패 시 무시 (안전장치)
      }
    });
    return () => {
      appended.forEach((link) => {
        if (link.parentNode) link.parentNode.removeChild(link);
      });
    };
  }, []);

  const handleCopyUrl = useCallback(async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleRetryBreakout = useCallback(() => {
    openInExternalBrowserWithFallback(
      window.location.href,
      () => setShowBridgeUI(true)
    );
  }, []);

  const handleStart = () => {
    // [CL-TOP20-P1-FUNNEL-20260703-014500] 히어로 주 CTA 계측(Top20 #20)
    trackFunnel('landing_hero_cta_click', { authed: !!user });
    if (user) {
      navigate('/budget');
    } else {
      navigate('/auth');
    }
  };

  // [CL-TOP20-P1-LANDING-20260703-014500] 기능 카드 내비게이션 + feature_card_click 계측(Top20 #5·#20)
  const makeFeatureNavigate = (feature: Feature): (() => void) | undefined => {
    const go =
      feature.externalLink && feature.aiLoadingTitle
        ? () =>
            startNavigation({
              url: feature.externalLink!,
              title: feature.aiLoadingTitle!,
            })
        : feature.externalLink
          ? () => openExternalLink(feature.externalLink!)
          : feature.link
            ? () => navigate(feature.link!)
            : undefined;
    if (!go) return undefined;
    return () => {
      trackFunnel('feature_card_click', { feature: feature.title });
      go();
    };
  };

  const guide = getAppSpecificGuide(
    browserInfo.detectedApp,
    browserInfo.isIOS,
    browserInfo.isAndroid
  );

  // 인앱 브라우저 + 자동 전환 실패 → 브릿지 UI
  if (showBridgeUI && browserInfo.isInAppBrowser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8">
        <div className="text-center max-w-sm w-full">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <ExternalLink className="w-10 h-10 text-primary" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground mb-2">
            외부 브라우저에서 열어주세요
          </h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {browserInfo.detectedApp
              ? `${browserInfo.detectedApp} 내`
              : '현재'}{' '}
            브라우저에서는 일부 기능이 제한됩니다.
            <br />
            아래 방법으로 {browserInfo.isIOS ? 'Safari' : 'Chrome'}에서
            접속해주세요.
          </p>

          <div className="space-y-3 mb-6">
            <Button onClick={handleRetryBreakout} className="w-full h-12">
              <ExternalLink className="w-4 h-4 mr-2" />
              외부 브라우저로 열기
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyUrl}
              className="w-full h-12 border-2 border-primary/30"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                  복사완료! 브라우저에 붙여넣기
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  URL 복사 후 Safari에 붙여넣기
                </>
              )}
            </Button>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-3">
              📱{' '}
              {browserInfo.detectedApp
                ? `${browserInfo.detectedApp}에서`
                : '직접'}{' '}
              여는 방법
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* [CL-TOP20-P1-LANDING-20260703-014500] 히어로 웜톤 배경(Top20 #4) — 상단 라디얼 로즈 틴트(장식·비간섭) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,hsl(var(--wedding-rose-soft))_0%,transparent_70%)] dark:opacity-40"
      />
      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-12 relative">
        {/* ─── Hero Section ─── */}
        <section className="flex flex-col items-center w-full max-w-lg">
          {/* Hero Icon — [CL-TOP20-P1-LANDING-20260703-014500] generic Sparkles → 웨딩 반지 모티프(Top20 #4) */}
          <div
            className="animate-fade-up animate-float"
            style={{ animationDelay: '0s' }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-wedding-rose-soft to-primary/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-wedding-rose/15">
              <WeddingMark size={44} className="text-wedding-gold" />
            </div>
          </div>

          {/* AI Badge */}
          <div
            className="animate-fade-up mb-6"
            style={{ animationDelay: '0.1s' }}
          >
            <Badge
              variant="outline"
              className="animate-shimmer bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 px-3 py-1"
              role="status"
            >
              <Sparkles
                className="w-3 h-3 mr-1.5 text-primary"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-primary">
                AI 기반 웨딩 플래너
              </span>
            </Badge>
          </div>

          {/* Title */}
          <div
            className="text-center mb-4 space-y-1 animate-fade-up"
            style={{ animationDelay: '0.15s' }}
          >
            <p className="text-2xl sm:text-3xl font-medium text-muted-foreground tracking-wide">
              결혼 준비,
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              꼼꼼한 셈 법
            </p>
            {/* [CL-TOP20-P1-LANDING-20260703-014500] 타이틀 그라디언트에 로즈 웜톤 블렌드(Top20 #4) */}
            <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-primary via-wedding-rose to-primary bg-clip-text text-transparent tracking-tighter">
              웨딩셈
            </h1>
          </div>

          {/* Subtitle — ⚠️ '스마트 결혼 준비 플랫폼' 은 prerender.mjs '/' 마커. 문구 변경 시 마커 동기 수정 필수. */}
          <p
            className="animate-fade-up text-sm sm:text-base text-muted-foreground text-center mb-10 max-w-xs leading-relaxed"
            style={{ animationDelay: '0.2s' }}
          >
            AI가 분석하고, 함께 준비하는
            <br />
            스마트 결혼 준비 플랫폼
          </p>
        </section>

        {/* ─── [CL-TOP20-P2-HUB-20260703-022500] 로그인 홈 허브 (Top20 #9) — 인증 시 방문자 도구 대신 표시 ─── */}
        {!loading && user && (
          <section
            className="w-full max-w-lg mb-10 animate-fade-up"
            style={{ animationDelay: '0.22s' }}
            aria-label="내 결혼 준비 현황"
          >
            <WeddingCountdown />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { icon: Calculator, label: '예산 이어하기', desc: '항목별 비용 관리', to: '/budget' },
                { icon: CalendarCheck, label: '체크리스트', desc: 'D-day 준비 현황', to: '/checklist' },
                { icon: BarChart3, label: '요약 보기', desc: '차트·비교 분석', to: '/summary' },
                { icon: UserRound, label: '프로필·배지', desc: '스트릭과 달성', to: '/profile' },
              ].map((q) => (
                <button
                  key={q.to}
                  onClick={() => navigate(q.to)}
                  className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-toss transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <q.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">{q.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{q.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
            {/* [CL-TOP20-P4-GAMIFY-20260703-044500] 다음 방문 이유(Top20 #18) — 스트릭 마일스톤 카운트다운 */}
            <NextMilestoneCard
              className="mt-3"
              loginStreakDays={streak.loginStreakDays}
              checklistStreakDays={streak.checklistStreakDays}
              loginActiveToday={streak.loginActiveToday}
              checklistActiveToday={streak.checklistActiveToday}
              loginNextMilestoneIn={streak.loginNextMilestoneIn}
              checklistNextMilestoneIn={streak.checklistNextMilestoneIn}
              isLoading={streak.isLoading}
            />
          </section>
        )}

        {/* ─── [CL-LOGIN-GATE-20260709-233447] 히어로 가입 카드 — 비로그인 전용(시뮬레이터/데모 폐지 슬롯) ─── */}
        {!loading && !user && (
          <section
            className="w-full max-w-lg mb-10 animate-fade-up"
            style={{ animationDelay: '0.22s' }}
            aria-label="Google 계정으로 빠른 시작"
          >
            <HeroSignupCard
              isInAppBrowser={browserInfo.isInAppBrowser}
              onInAppEscape={handleRetryBreakout}
            />
          </section>
        )}

        {/* ─── Feature Cards Section — [CL-TOP20-P1-LANDING-20260703-014500] 3+3 위계(Top20 #5) ─── */}
        <section
          className="w-full max-w-lg mb-10 animate-fade-up"
          style={{ animationDelay: '0.25s' }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground text-center mb-4 tracking-wider uppercase">
            주요 기능
          </h2>
          {/* 주력 3종 — 대형 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {FEATURES.filter((f) => f.priority === 'high').map((feature) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                emphasis
                onNavigate={makeFeatureNavigate(feature)}
              />
            ))}
          </div>
          {/* 특화 3종 — 컴팩트 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURES.filter((f) => f.priority === 'sub').map((feature) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                onNavigate={makeFeatureNavigate(feature)}
              />
            ))}
          </div>
        </section>

        {/* ─── Social Proof ─── */}
        <div
          className="w-full max-w-lg mb-10 animate-fade-up"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="bg-secondary/50 rounded-2xl py-4 px-6 flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                5,000+
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                실제 비용 데이터
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                6개
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                AI 기능
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              {/* [CL-GAMIFY-INT-20260418-222329] 로그인 streak 노출 — 로그인 유저만 */}
              {user && !streak.isLoading && streak.loginStreakDays > 0 ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  <StreakFlame
                    days={streak.loginStreakDays}
                    variant="login"
                    size="sm"
                  />
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    연속 로그인
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-lg sm:text-2xl font-bold text-primary">무료</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    평생 비용
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── CTA Section ─── */}
        <div
          className="w-full max-w-sm animate-fade-up"
          style={{ animationDelay: '0.4s' }}
        >
          <Button
            onClick={handleStart}
            disabled={loading}
            size="lg"
            className={cn(
              'w-full h-16 text-lg font-bold rounded-xl',
              // [CL-TOP20-P1-LANDING-20260703-014500] 블루 하드코딩 → 토큰 그라디언트(Top20 #4)
              'bg-gradient-to-r from-primary to-primary/80',
              'text-white',
              'shadow-primary-glow',
              'hover:shadow-primary-glow-lg',
              'hover:scale-[1.02]',
              'active:scale-[0.98]',
              'transition-all duration-200 ease-out',
              'animate-pulse-subtle'
            )}
          >
            {loading
              ? '로딩 중...'
              : user
                ? '예산 관리하기'
                : '무료로 시작하기'}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-3">
            30초면 시작할 수 있어요 · 카드 등록 없음
          </p>

          {/* [CL-LOGIN-GATE-20260709-233447] "가입 없이 둘러보기"(/demo) CTA 폐지 — 로그인 필수화 */}
          {!loading && !user && (
            <button
              onClick={() => navigate('/auth')}
              className="mt-3 w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center"
            >
              이미 계정이 있으신가요?
            </button>
          )}

          {/* [CL-PWA-A2HS-20260706-202700] 홈 화면 바로가기 CTA — 전 사용자 노출·설치본에서는 자체 gating 으로 숨김 */}
          <InstallAppButton placement="hero" />
        </div>

        {/* ─── [CL-TOP20-P1-LANDING-20260703-014500] AI 챗 미리보기 (Top20 #1 일부) — 비로그인 전용(로그인은 실챗 사용) ─── */}
        {!loading && !user && (
          <section
            className="w-full max-w-lg mt-16 animate-fade-up"
            style={{ animationDelay: '0.42s' }}
            aria-label="AI 웨딩 챗봇 미리보기"
          >
            <ChatPreview onSignupClick={() => navigate('/auth')} />
          </section>
        )}

        {/* ─── [CL-TOP20-P1-LANDING-20260703-014500] 신뢰 섹션 (Top20 #2) ─── */}
        <TrustSection className="w-full max-w-lg mt-16 animate-fade-up" />

        {/* ─── [CL-ADSENSE-CONTENT-20260630] 공개 콘텐츠 섹션 (비로그인·크롤 가능·프리렌더) ─── */}
        <section className="w-full max-w-lg mt-16 animate-fade-up" style={{ animationDelay: '0.45s' }}>
          {/* 서비스 설명(실텍스트) */}
          <h2 className="text-xl font-bold text-foreground mb-3">웨딩셈은 결혼 준비를 이렇게 도와드려요</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            결혼 준비는 정보 비대칭이 큰 영역입니다. "결혼 비용이 얼마"라는 숫자는 신혼집 포함 여부에 따라 수천만 원에서 수억 원까지
            갈리고, 무엇을 언제부터 해야 할지도 막막합니다. 웨딩셈은 <strong className="text-foreground">공개 통계와 실제 견적 사례</strong>를
            바탕으로 항목별 예산을 투명하게 계획하고, D-day 기준 체크리스트와 AI 상담으로 준비 과정을 단계별로 안내합니다.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            아래는 한국소비자원·통계청·결혼정보회사의 공개 자료로 정리한 결혼 비용 개요입니다. 모든 수치는 범위로 보고
            지역·시기·업체에 따라 달라질 수 있으니, 자세한 산정 기준은 <Link to="/guide/wedding-cost-data/" className="text-primary hover:underline">결혼 비용 데이터·방법론</Link> 페이지를 참고하세요.
          </p>

          {/* 결혼 비용 한눈에 (실데이터 스냅샷) */}
          <h3 className="text-base font-semibold text-foreground mb-3">결혼 비용 한눈에 (공개 자료 기준)</h3>
          <div className="overflow-x-auto mb-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-foreground border-b border-border py-2 px-2">항목</th>
                  <th className="text-left font-semibold text-foreground border-b border-border py-2 px-2">평균 (개요)</th>
                  <th className="text-left font-semibold text-foreground border-b border-border py-2 px-2 whitespace-nowrap">자료</th>
                </tr>
              </thead>
              <tbody>
                {/* [CL-COST-2026Q2-20260713-231500] 2026 상반기 공표치 갱신 — 데이터허브(articles-t4)와 동일 수치 유지 */}
                {[
                  ['결혼식 비용(예식장+스드메)', '약 2,139만 원', '한국소비자원 2026.2'],
                  ['신혼집 제외 결혼 비용', '약 5,912만 원', '듀오 2026'],
                  ['신혼집 포함 총비용', '약 3억 8,113만 원', '듀오 2026'],
                  ['하객 1인 식대(중간값)', '약 5만 8천 원', '한국소비자원'],
                  ['평균 하객 수', '약 279명', '듀오'],
                  ['평균 축의금', '약 11만 7천 원', 'NH농협 2026'],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td className="text-muted-foreground border-b border-border/50 py-2 px-2 align-top">{r[0]}</td>
                    <td className="text-foreground border-b border-border/50 py-2 px-2 align-top font-medium tabular-nums">{r[1]}</td>
                    <td className="text-muted-foreground border-b border-border/50 py-2 px-2 align-top whitespace-nowrap">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/70 mb-8">
            ※ 신혼집이 전체 비용의 약 84%를 차지합니다(듀오 2026). 출처와 산정 기준은 각 가이드 하단 "참고 자료"에 표기합니다.
          </p>

          {/* 인기 가이드 카드 */}
          <h3 className="text-base font-semibold text-foreground mb-3">인기 결혼 준비 가이드</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {ARTICLES.slice(0, 6).map((a) => (
              <Link
                key={a.slug}
                to={`/guide/${a.slug}/`}
                className="block p-4 rounded-xl bg-card border border-border/50 hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground mb-1 leading-snug">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.description}</p>
              </Link>
            ))}
          </div>
          {/* [CL-ADSENSE-MAX-20260710-002000] 콘텐츠 볼륨 노출 — 편수는 레지스트리 파생(하드코딩 금지) */}
          <Link to="/guide/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
            결혼 예산 가이드 {ARTICLES.length}편 전체 보기 →
          </Link>

          {/* FAQ 프리뷰 */}
          <h3 className="text-base font-semibold text-foreground mb-3 mt-4">자주 묻는 질문</h3>
          <div className="space-y-2 mb-3">
            {[
              ['결혼 비용은 보통 얼마인가요?', '신혼집을 제외한 결혼식·혼수 비용은 평균 약 2,100만~8,100만 원 범위이며, 신혼집을 포함하면 수도권 기준 수억 원에 이릅니다. 하객 규모와 신혼집 마련 방식이 총비용을 크게 좌우합니다.'],
              ['결혼 준비는 무엇부터 시작하나요?', '예식일과 총예산을 먼저 정한 뒤 예식장 → 스드메 → 혼수·예단 순으로 진행하는 것이 일반적입니다. 웨딩셈의 D-day 체크리스트가 시기별 할 일을 자동으로 안내합니다.'],
              // [CL-COST-2026Q2-20260713-231500] 참가격 2026년 2월 동향 기준으로 갱신
              ['스드메 비용은 어느 정도인가요?', '스튜디오·드레스·메이크업 패키지는 구성에 따라 차이가 크며, 한국소비자원 참가격 기준 전국 중간값은 약 294만 원 수준(2026년 2월 기준)입니다. 헬퍼비·교통비 등 숨은 비용까지 견적서로 비교하는 것이 중요합니다.'],
            ].map((qa) => (
              <details key={qa[0]} className="group bg-card border border-border/50 rounded-xl px-4 py-3">
                <summary className="text-sm font-semibold text-foreground cursor-pointer list-none">{qa[0]}</summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">{qa[1]}</p>
              </details>
            ))}
          </div>
          <Link to="/faq/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            자주 묻는 질문 더 보기 →
          </Link>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <Footer />

      {/* [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 이동 로딩 오버레이 */}
      <AIExternalNavigationOverlay {...overlayProps} />
    </div>
  );
}

/* ─── Feature Card Component ─── */
// [FIX-20260418-051200] forwardRef 적용 — Landing의 ref 경고 해소
// [CL-TOP20-P1-LANDING-20260703-014500] emphasis(주력 3종) — 세로 대형 레이아웃(Top20 #5)
const FeatureCard = forwardRef<HTMLDivElement, { feature: Feature; onNavigate?: () => void; emphasis?: boolean }>(function FeatureCard({ feature, onNavigate, emphasis = false }, ref) {
  const Icon = feature.icon;

  return (
    <Card
      ref={ref}
      className={cn(
        'transition-all duration-200 hover:shadow-toss hover:scale-[1.02]',
        emphasis ? 'p-5' : 'p-4',
        feature.isAI && 'ai-glow border-primary/20',
        onNavigate && 'cursor-pointer'
      )}
      role="article"
      onClick={onNavigate}
    >
      <div className={cn('flex gap-3', emphasis ? 'flex-col items-center text-center' : 'items-start')}>
        {/* Icon */}
        <div
          className={cn(
            'rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
            emphasis ? 'w-12 h-12' : 'w-10 h-10',
            feature.gradient
          )}
        >
          <Icon
            className={cn(emphasis ? 'w-6 h-6' : 'w-5 h-5', feature.iconColor)}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn('flex items-center gap-1.5 mb-1', emphasis && 'justify-center')}>
            <h3 className={cn('font-semibold text-foreground leading-tight', emphasis ? 'text-base' : 'text-sm')}>
              {feature.title}
            </h3>
            {feature.isAI && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-0 px-1.5 py-0 text-[10px] font-medium leading-tight"
              >
                AI
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
          {onNavigate && (
            /* [CL-LOGIN-GATE-20260709-233447] 기능이 로그인 게이트이므로 '체험' 카피는 부정확 → '바로가기' */
            <p className={cn('text-xs text-primary font-medium mt-1.5')}>
              바로가기 →
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});
