// [CL-HOME-BTN-ALL-20260403-223000] sticky header + 한국어화
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSEO } from '@/hooks/useSEO';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useSEO({
    title: '페이지를 찾을 수 없습니다 - 웨딩셈',
    description: '요청하신 페이지를 찾을 수 없습니다.',
    path: location.pathname,
  });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="홈으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
          <p className="mb-6 text-lg text-muted-foreground">페이지를 찾을 수 없습니다</p>
          <Button onClick={() => navigate('/')}>
            홈으로 돌아가기
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
