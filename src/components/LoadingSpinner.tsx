import { Sparkles } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {/* [CL-TOP20-P0-20260703-002000] prefers-reduced-motion 존중 — 인증/라우트 전환 첫 화면(방문자 노출 최다) */}
      <div className="animate-pulse motion-reduce:animate-none flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}
