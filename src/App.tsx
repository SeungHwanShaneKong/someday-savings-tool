import { useState, useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { AdSenseLayout } from "@/components/AdSenseLayout";
import { MobileDesktopNotice } from "@/components/MobileDesktopNotice";
import { UpdateNotice } from "@/components/UpdateNotice";
// [CL-ONBOARDING-20260619-222424] 첫 방문 기능 투어 캐러셀
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
// [CL-COEDIT-E2E-20260620-130000] OAuth 복귀 후 초대 재개 워처
import { InviteResumeWatcher } from "@/components/collaboration/InviteResumeWatcher";
// [CL-FEEDBACK-DAILY-20260621] 하루 1회 은은한 피드백 권유(토스트→모달)
import { FeatureRequestPrompt } from "@/components/FeatureRequestPrompt";
import { ChatFab } from "@/components/chat/ChatFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { lazyWithRetry } from "@/lib/lazyWithRetry"; // [CL-QUALITY-CHUNK-20260621] 청크 로드 실패 복구
import { AppErrorBoundary } from "@/components/AppErrorBoundary"; // [CL-QUALITY-ERRBOUND-20260621] 전역 경계
import { EXTERNAL_URLS } from "@/lib/external-links"; // [CL-HONEYMOON-EXTERNAL-20260416-221500]

/* ─── Static import: Landing (첫 화면 LCP 최적화) ─── */
import Landing from "./pages/Landing";

/* ─── Lazy imports: 코드 분할(초기 번들 최소화) + [CL-QUALITY-CHUNK-20260621] 재배포 청크404 복구 래퍼 ─── */
const Auth = lazyWithRetry(() => import("./pages/Auth"), { routeId: "Auth" });
const BudgetFlow = lazyWithRetry(() => import("./pages/BudgetFlow"), { routeId: "BudgetFlow" });
const Summary = lazyWithRetry(() => import("./pages/Summary"), { routeId: "Summary" });
const SharedBudget = lazyWithRetry(() => import("./pages/SharedBudget"), { routeId: "SharedBudget" });
const Checklist = lazyWithRetry(() => import("./pages/Checklist"), { routeId: "Checklist" });
// [CL-HONEYMOON-EXTERNAL-20260416-221500] Honeymoon lazy import 제거 → 외부 리다이렉트
const Chat = lazyWithRetry(() => import("./pages/Chat"), { routeId: "Chat" });
const Admin = lazyWithRetry(() => import("./pages/Admin"), { routeId: "Admin" });
const FAQ = lazyWithRetry(() => import("./pages/FAQ"), { routeId: "FAQ" });
const Guide = lazyWithRetry(() => import("./pages/Guide"), { routeId: "Guide" });
// [CL-SSG-PRERENDER-20260531] 데이터 주도 가이드 아티클 (W6) — /guide/:slug
const Article = lazyWithRetry(() => import("./pages/Article"), { routeId: "Article" });
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), { routeId: "NotFound" });
// [CL-GAMIFY-INT-20260418-222329] Wedding Prep Passport 프로필 페이지
const Profile = lazyWithRetry(() => import("./pages/Profile"), { routeId: "Profile" });
// [CL-ADSENSE-20260619-234411] 정책/정보 페이지(개인정보·약관·소개·문의) — AdSense 필수
const StaticPage = lazyWithRetry(() => import("./pages/StaticPage"), { routeId: "StaticPage" });
// [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대 수락 페이지
const AcceptInvite = lazyWithRetry(() => import("./pages/AcceptInvite"), { routeId: "AcceptInvite" });

// [CL-PERF-QUERY-20260418-230000] React Query 기본 설정 최적화
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5분 — 불필요 refetch 차단
      gcTime: 10 * 60 * 1000,         // 10분 캐시 유지
      refetchOnWindowFocus: false,     // 탭 전환 시 불필요 refetch 차단
      retry: 1,
    },
  },
});

// [CL-HONEYMOON-EXTERNAL-20260416-221500] /honeymoon 직접 접속 → 외부 사이트 리다이렉트
function HoneymoonRedirect() {
  useEffect(() => { window.location.href = EXTERNAL_URLS.honeymoon; }, []);
  return <LoadingSpinner />;
}

function AppRoutes() {
  usePageTracking();
  const [chatOpen, setChatOpen] = useState(false);

  // [CL-ADMIN-FEATURE-REQ-20260403] 오프라인 기능 요청 큐 flush
  useEffect(() => {
    import('@/lib/feature-request-queue').then(m => m.flushFeatureRequestQueue()).catch(() => {});
  }, []);

  return (
    <>
      <MobileDesktopNotice />
      <UpdateNotice />
      <OnboardingCarousel />
      <InviteResumeWatcher />
      <FeatureRequestPrompt />
      <AppErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/budget" element={<BudgetFlow />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/honeymoon" element={<HoneymoonRedirect />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/shared/:token" element={<SharedBudget />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/guide" element={<Guide />} />
          {/* [CL-SSG-PRERENDER-20260531] 가이드 아티클 (W6) */}
          <Route path="/guide/:slug" element={<Article />} />
          {/* [CL-GAMIFY-INT-20260418-222329] 프로필 페이지 */}
          <Route path="/profile" element={<Profile />} />
          {/* [CL-ADSENSE-20260619-234411] 정책/정보 페이지 — 프리렌더 trailing-slash canonical */}
          <Route path="/privacy" element={<StaticPage pageKey="privacy" />} />
          <Route path="/terms" element={<StaticPage pageKey="terms" />} />
          <Route path="/about" element={<StaticPage pageKey="about" />} />
          <Route path="/contact" element={<StaticPage pageKey="contact" />} />
          {/* [CL-ADSENSE-CONTENT-20260630] 편집·제작 원칙(E-E-A-T) */}
          <Route path="/editorial" element={<StaticPage pageKey="editorial" />} />
          {/* [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대 수락 (auth·동적 — 비프리렌더) */}
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </AppErrorBoundary>
      {/* Global Q&A FAB — visible on all pages except /, /auth, /chat */}
      <ChatFab onClick={() => setChatOpen(true)} />
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            // [CL-PREVIEW-SYNC-20260403-120830] Silence React Router v7 migration warnings in preview
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AdSenseLayout>
            <AppRoutes />
          </AdSenseLayout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
