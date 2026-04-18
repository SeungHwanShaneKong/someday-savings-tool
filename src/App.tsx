import { useState, useEffect, lazy, Suspense } from "react";
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
import { ChatFab } from "@/components/chat/ChatFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { EXTERNAL_URLS } from "@/lib/external-links"; // [CL-HONEYMOON-EXTERNAL-20260416-221500]

/* ─── Static import: Landing (첫 화면 LCP 최적화) ─── */
import Landing from "./pages/Landing";

/* ─── Lazy imports: 코드 분할로 초기 번들 크기 최소화 ─── */
const Auth = lazy(() => import("./pages/Auth"));
const BudgetFlow = lazy(() => import("./pages/BudgetFlow"));
const Summary = lazy(() => import("./pages/Summary"));
const SharedBudget = lazy(() => import("./pages/SharedBudget"));
const Checklist = lazy(() => import("./pages/Checklist"));
// [CL-HONEYMOON-EXTERNAL-20260416-221500] Honeymoon lazy import 제거 → 외부 리다이렉트
const Chat = lazy(() => import("./pages/Chat"));
const Admin = lazy(() => import("./pages/Admin"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Guide = lazy(() => import("./pages/Guide"));
const NotFound = lazy(() => import("./pages/NotFound"));
// [CL-GAMIFY-INT-20260418-222329] Wedding Prep Passport 프로필 페이지
const Profile = lazy(() => import("./pages/Profile"));

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
          {/* [CL-GAMIFY-INT-20260418-222329] 프로필 페이지 */}
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
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
