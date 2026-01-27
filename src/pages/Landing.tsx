import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
export default function Landing() {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  const handleStart = () => {
    if (user) {
      navigate('/budget');
    } else {
      navigate('/auth');
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Hero Icon */}
        <div className="text-7xl mb-8 animate-bounce">💒</div>

        {/* Title */}
        <div className="text-center mb-6 space-y-1">
          <p className="text-2xl sm:text-3xl font-medium text-muted-foreground tracking-wide">
            결혼 준비,
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            꼼꼼한 셈 법
          </p>
          <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent tracking-tighter">
            결혼셈
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-body-lg text-muted-foreground text-center mb-12 max-w-sm">복잡한 결혼 준비,
깔끔하게 정리된 예산 계획으로 한결 가벼워져요</p>

        {/* Features */}
        <div className="w-full max-w-sm space-y-3 mb-12">
          <FeatureItem icon="📊" text="한눈에 보는 예산 현황" />
          <FeatureItem icon="✅" text="결제 체크리스트로 진행 상황 관리" />
          <FeatureItem icon="🔗" text="예산표 이미지 저장 & 공유" />
        </div>

        {/* CTA Button - Prominent with glow effect */}
        <Button onClick={handleStart} disabled={loading} size="lg" className="w-full max-w-sm h-16 text-lg font-bold rounded-xl 
            bg-gradient-to-r from-blue-700 to-blue-600 
            text-white
            shadow-[0_4px_20px_rgba(0,80,200,0.5)] 
            hover:shadow-[0_6px_30px_rgba(0,80,200,0.6)] 
            hover:scale-[1.02] 
            active:scale-[0.98]
            transition-all duration-200 ease-out
            animate-pulse-subtle">
          {loading ? '로딩 중...' : user ? '예산 관리하기' : '시작하기'}
        </Button>

        {/* Login link for non-logged in users */}
        {!loading && !user && <button onClick={() => navigate('/auth')} className="mt-4 text-body text-muted-foreground hover:text-primary transition-colors">
            이미 계정이 있으신가요?
          </button>}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-small text-muted-foreground">
        결혼자금 계산기 • Made with 💙
      </footer>
    </div>;
}
function FeatureItem({
  icon,
  text
}: {
  icon: string;
  text: string;
}) {
  return <div className="flex items-center gap-3 py-2">
      <span className="text-xl">{icon}</span>
      <span className="text-body text-muted-foreground">{text}</span>
    </div>;
}