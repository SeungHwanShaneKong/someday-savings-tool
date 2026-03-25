/**
 * [CL-HONEYMOON-REDESIGN-20260316] 이미지 월드컵 스텝
 * 7매치(8강→4강→결승) 진행, 라운드 인디케이터
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { WorldCupCard } from './WorldCupCard';
import type { WorldCupMatch } from '@/lib/honeymoon-images';

interface WorldCupStepProps {
  match: WorldCupMatch;
  round: number; // 0-6
  onSelect: (winnerId: string) => void;
}

const ROUND_LABELS: Record<string, string> = {
  QF: '8강',
  SF: '4강',
  FINAL: '결승',
};

function getRoundDisplay(match: WorldCupMatch): string {
  const label = ROUND_LABELS[match.round] ?? '';
  if (match.round === 'QF') return `${label} ${match.matchIndex + 1}/4`;
  if (match.round === 'SF') return `${label} ${match.matchIndex + 1}/2`;
  return label;
}

export function WorldCupStep({ match, round, onSelect }: WorldCupStepProps) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 매치 전환 시 상태 리셋
  useEffect(() => {
    setWinnerId(null);
    setIsAnimating(false);
  }, [match.globalIndex]);

  const handleSelect = useCallback((selectedId: string) => {
    if (isAnimating) return;
    setWinnerId(selectedId);
    setIsAnimating(true);

    // 애니메이션 후 다음 매치로
    setTimeout(() => {
      onSelect(selectedId);
    }, 600);
  }, [isAnimating, onSelect]);

  const getWinState = (imageId: string): boolean | null => {
    if (winnerId === null) return null;
    return imageId === winnerId;
  };

  return (
    <div className="flex flex-col items-center w-full py-6">
      {/* Round indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
          {getRoundDisplay(match)}
        </span>
      </div>

      {/* Match counter dots */}
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i < round ? 'bg-primary' :
              i === round ? 'bg-primary scale-125' :
              'bg-muted-foreground/20',
            )}
          />
        ))}
      </div>

      {/* Question */}
      <h2 className="text-heading text-foreground text-center mb-6">
        어떤 분위기가
        <br />
        더 끌리세요?
      </h2>

      {/* Two cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        <WorldCupCard
          image={match.imageA}
          position="left"
          onSelect={() => handleSelect(match.imageA.id)}
          isWinner={getWinState(match.imageA.id)}
          disabled={isAnimating}
        />
        <WorldCupCard
          image={match.imageB}
          position="right"
          onSelect={() => handleSelect(match.imageB.id)}
          isWinner={getWinState(match.imageB.id)}
          disabled={isAnimating}
        />
      </div>

      {/* VS indicator */}
      <div className="flex items-center justify-center -mt-[calc(50%+1rem)] mb-[calc(50%-1rem)] z-10 pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-toss">
          <span className="text-xs font-bold text-muted-foreground">VS</span>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-4">
        마음에 드는 이미지를 탭해주세요
      </p>
    </div>
  );
}
