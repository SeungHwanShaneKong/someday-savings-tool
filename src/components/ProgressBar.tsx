import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <span className="text-caption text-muted-foreground">
          {totalSteps}단계 중 {currentStep}단계
        </span>
        <span className="text-caption font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
