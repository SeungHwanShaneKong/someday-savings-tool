import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, AlertCircle, CloudUpload, Trash2, Database, Shield } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RestoreProgress {
  phase: 'preparing' | 'backup' | 'deleting' | 'restoring' | 'validating' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

interface RestoreProgressIndicatorProps {
  progress: RestoreProgress | null;
  className?: string;
}

const PHASE_ICONS = {
  preparing: Loader2,
  backup: CloudUpload,
  deleting: Trash2,
  restoring: Database,
  validating: Shield,
  complete: CheckCircle2,
  error: AlertCircle,
};

const PHASE_COLORS = {
  preparing: 'text-muted-foreground',
  backup: 'text-blue-500',
  deleting: 'text-orange-500',
  restoring: 'text-primary',
  validating: 'text-purple-500',
  complete: 'text-green-500',
  error: 'text-destructive',
};

export function RestoreProgressIndicator({ progress, className }: RestoreProgressIndicatorProps) {
  if (!progress) return null;

  const Icon = PHASE_ICONS[progress.phase];
  const colorClass = PHASE_COLORS[progress.phase];
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isAnimating = progress.phase !== 'complete' && progress.phase !== 'error';

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
      className
    )}>
      <div className="bg-card rounded-2xl shadow-2xl p-6 w-[90vw] max-w-[360px] space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            progress.phase === 'complete' ? 'bg-primary/20' : 
            progress.phase === 'error' ? 'bg-destructive/10' : 
            'bg-primary/10'
          )}>
            <Icon 
              className={cn(
                'h-5 w-5',
                colorClass,
                isAnimating && 'animate-spin'
              )} 
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{progress.message}</p>
            <p className="text-xs text-muted-foreground">
              {progress.current} / {progress.total} 단계
            </p>
          </div>
        </div>
        
        <Progress 
          value={percentage} 
          className={cn(
            'h-2',
            progress.phase === 'complete' && '[&>div]:bg-primary',
            progress.phase === 'error' && '[&>div]:bg-destructive'
          )}
        />

        {progress.phase === 'complete' && (
          <p className="text-center text-sm text-primary font-medium">
            ✨ 복원이 완료되었습니다!
          </p>
        )}

        {progress.phase === 'error' && (
          <p className="text-center text-sm text-destructive">
            복원 중 오류가 발생했습니다.
          </p>
        )}
      </div>
    </div>
  );
}
