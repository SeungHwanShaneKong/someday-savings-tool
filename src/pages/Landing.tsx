import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleStart = () => {
    if (user) {
      navigate('/budget');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Hero Icon */}
        <div className="text-7xl mb-8 animate-bounce">💒</div>

        {/* Title */}
        <h1 className="text-display text-foreground text-center mb-4 leading-tight">
          결혼 준비,<br />
          예산부터 가볍게<br />
          시작하세요
        </h1>

        {/* Subtitle */}
        <p className="text-body-lg text-muted-foreground text-center mb-12 max-w-sm">
          복잡한 결혼 준비, 깔끔하게 정리된 예산 계획으로
          한결 가벼워져요
        </p>

        {/* Features */}
        <div className="w-full max-w-sm space-y-3 mb-12">
          <FeatureItem icon="📊" text="한눈에 보는 예산 현황" />
          <FeatureItem icon="✅" text="결제 체크리스트로 진행 상황 관리" />
          <FeatureItem icon="🔗" text="예산표 이미지 저장 & 공유" />
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleStart}
          disabled={loading}
          size="lg"
          className="w-full max-w-sm h-14 text-body-lg font-semibold rounded-xl shadow-toss"
        >
          {loading ? '로딩 중...' : user ? '예산 관리하기' : '시작하기'}
        </Button>

        {/* Login link for non-logged in users */}
        {!loading && !user && (
          <button
            onClick={() => navigate('/auth')}
            className="mt-4 text-body text-muted-foreground hover:text-primary transition-colors"
          >
            이미 계정이 있으신가요?
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-small text-muted-foreground">
        결혼자금 계산기 • Made with 💙
      </footer>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
      <span className="text-2xl">{icon}</span>
      <span className="text-body text-foreground">{text}</span>
    </div>
  );
}
