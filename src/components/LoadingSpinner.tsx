import { Sparkles } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}
