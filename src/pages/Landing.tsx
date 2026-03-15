import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Share2,
} from 'lucide-react';
import Footer from '@/components/Footer';
import type { LucideIcon } from 'lucide-react';
import {
  getBrowserInfo,
  openInExternalBrowserWithFallback,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';
import { useSEO } from '@/hooks/useSEO';

/* ─── Feature Data ─── */
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  isAI: boolean;
  gradient: string;
  iconColor: string;
  link?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Calculator,
    title: '예산 시뮬레이터',
    description: '카테고리별 비용을 입력하면 평균 비용과 비교 분석해줘요',
    isAI: false,
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'text-blue-500',
    link: '/budget',
  },
  {
    icon: CalendarCheck,
    title: 'D-day 체크리스트 AI',
    description: '✨ 결혼일 기준으로 AI가 자동 생성하는 시기별 준비 리스트',
    isAI: true,
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconColor: 'text-emerald-500',
    link: '/checklist',
  },
  {
    icon: Brain,
    title: 'AI 비용 인사이트',
    description: '숨겨진 비용 경고, 절약 팁, 예산 최적화를 실시간 추천',
    isAI: true,
    gradient: 'from-violet-500/10 to-violet-600/5',
    iconColor: 'text-violet-500',
    link: '/budget',
  },
  {
    icon: MapPin,
    title: 'AI 허니문 큐레이션',
    description: '예산과 취향에 맞는 여행지를 AI가 추천하고 지도로 비교',
    isAI: true,
    gradient: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'text-amber-500',
    link: '/honeymoon',
  },
  {
    icon: MessageCircle,
    title: 'AI Q&A 챗봇',
    description: '결혼 준비 궁금증을 실시간 AI 어드바이저에게 질문',
    isAI: true,
    gradient: 'from-rose-500/10 to-rose-600/5',
    iconColor: 'text-rose-500',
    link: '/chat',
  },
  {
    icon: Share2,
    title: '예산요약 저장 & 공유',
    description: '예산표를 이미지로 저장하고 링크로 간편하게 공유',
    isAI: false,
    gradient: 'from-slate-500/10 to-slate-600/5',
    iconColor: 'text-slate-500',
    link: '/summary',
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

  // 랜딩 페이지 진입 시 인앱 브라우저 감지 → 다중 탈출 전략 실행
  useEffect(() => {
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowserWithFallback(
        window.location.href,
        () => setShowBridgeUI(true)
      );
    }
  }, [browserInfo.isInAppBrowser]);

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
    if (user) {
      navigate('/budget');
    } else {
      navigate('/auth');
    }
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
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-12">
        {/* ─── Hero Section ─── */}
        <section className="flex flex-col items-center w-full max-w-lg">
          {/* Hero Icon */}
          <div
            className="animate-fade-up animate-float"
            style={{ animationDelay: '0s' }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary" aria-hidden="true" />
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
            <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent tracking-tighter">
              웨딩셈
            </h1>
          </div>

          {/* Subtitle */}
          <p
            className="animate-fade-up text-sm sm:text-base text-muted-foreground text-center mb-10 max-w-xs leading-relaxed"
            style={{ animationDelay: '0.2s' }}
          >
            AI가 분석하고, 함께 준비하는
            <br />
            스마트 결혼 준비 플랫폼
          </p>
        </section>

        {/* ─── Feature Cards Section ─── */}
        <section
          className="w-full max-w-lg mb-10 animate-fade-up"
          style={{ animationDelay: '0.25s' }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground text-center mb-4 tracking-wider uppercase">
            주요 기능
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} onNavigate={feature.link ? () => navigate(feature.link!) : undefined} />
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
              <p className="text-lg sm:text-2xl font-bold text-primary">무료</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                시작 비용
              </p>
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
              'bg-gradient-to-r from-blue-700 to-blue-600',
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

          {!loading && !user && (
            <button
              onClick={() => navigate('/auth')}
              className="mt-3 w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center"
            >
              이미 계정이 있으신가요?
            </button>
          )}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <Footer />
    </div>
  );
}

/* ─── Feature Card Component ─── */
function FeatureCard({ feature, onNavigate }: { feature: Feature; onNavigate?: () => void }) {
  const Icon = feature.icon;

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200 hover:shadow-toss hover:scale-[1.02]',
        feature.isAI && 'ai-glow border-primary/20',
        onNavigate && 'cursor-pointer'
      )}
      role="article"
      onClick={onNavigate}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
            feature.gradient
          )}
        >
          <Icon
            className={cn('w-5 h-5', feature.iconColor)}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
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
            <p className="text-xs text-primary font-medium mt-1.5">
              체험하기 →
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
