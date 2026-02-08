import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { KakaoInAppBrowserGuard } from '@/components/KakaoInAppBrowserGuard';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, loading } = useAuth();
  const { toast } = useToast();
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/budget" replace />;
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google 로그인 실패',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <KakaoInAppBrowserGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 pb-8 max-w-lg mx-auto w-full">
          {/* Icon */}
          <div className="text-center mb-8">
            <span className="text-6xl">💒</span>
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-display text-foreground mb-2">
              간편하게 시작하세요
            </h1>
            <p className="text-body-lg text-muted-foreground">
              Google 계정으로 로그인하고<br />
              결혼 예산 계획을 시작해보세요
            </p>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full h-14 text-body-lg font-medium rounded-xl flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isGoogleLoading ? '연결 중...' : 'Google로 계속하기'}
          </Button>

          {/* Info text */}
          <p className="text-center text-small text-muted-foreground mt-6">
            로그인하면 예산 데이터가 안전하게 저장되어<br />
            언제든 다시 확인할 수 있어요
          </p>
        </main>
      </div>
    </KakaoInAppBrowserGuard>
  );
}
