import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { AdSenseLayout } from "@/components/AdSenseLayout";
import { MobileDesktopNotice } from "@/components/MobileDesktopNotice";
import { ChatFab } from "@/components/chat/ChatFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import BudgetFlow from "./pages/BudgetFlow";
import Summary from "./pages/Summary";
import SharedBudget from "./pages/SharedBudget";
import Checklist from "./pages/Checklist";
import Honeymoon from "./pages/Honeymoon";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  usePageTracking();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <MobileDesktopNotice />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/budget" element={<BudgetFlow />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/honeymoon" element={<Honeymoon />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/shared/:token" element={<SharedBudget />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
        <BrowserRouter>
          <AdSenseLayout>
            <AppRoutes />
          </AdSenseLayout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
