/**
 * [CL-HONEYMOON-REDESIGN-20260316] 이미지 월드컵 스텝
 * [CL-IMPROVE-7TASKS-20260330] 15매치(16강→8강→4강→결승) 진행, 라운드 그룹 인디케이터
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { WorldCupCard } from './WorldCupCard';
import { Check } from 'lucide-react';
import type { WorldCupMatch } from '@/lib/honeymoon-images';

interface WorldCupStepProps {
  match: WorldCupMatch;
  round: number; // 0-14
  onSelect: (winnerId: string) => void;
}

// [CL-IMPROVE-7TASKS-20260330] 라운드 라벨 + 매치 수
const ROUND_CONFIG: Record<string, { label: string; count: number; startIdx: number }> = {
  R16:   { label: '16강', count: 8, startIdx: 0 },
  QF:    { label: '8강',  count: 4, startIdx: 8 },
  SF:    { label: '4강',  count: 2, startIdx: 12 },
  FINAL: { label: '결승', count: 1, startIdx: 14 },
};

const ROUND_ORDER = ['R16', 'QF', 'SF', 'FINAL'] as const;

function getRoundDisplay(match: WorldCupMatch): string {
  const cfg = ROUND_CONFIG[match.round];
  if (!cfg) return '';
  if (cfg.count === 1) return cfg.label;
  return `${cfg.label} ${match.matchIndex + 1}/${cfg.count}`;
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

  // [CL-IMPROVE-7TASKS-20260330] 현재 라운드의 인덱스 계산
  const currentRoundCfg = ROUND_CONFIG[match.round];
  const matchInRound = round - (currentRoundCfg?.startIdx ?? 0);

  return (
    <div className="flex flex-col items-center w-full py-6">
      {/* Round indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
          {getRoundDisplay(match)}
        </span>
      </div>

      {/* [CL-IMPROVE-7TASKS-20260330] 라운드 그룹 인디케이터 */}
      <div className="flex items-center gap-2 mb-6">
        {ROUND_ORDER.map((roundKey) => {
          const cfg = ROUND_CONFIG[roundKey];
          const isCurrentRound = match.round === roundKey;
          const isCompletedRound = round >= cfg.startIdx + cfg.count;
          const isPastRound = round >= cfg.startIdx;

          return (
            <div key={roundKey} className="flex items-center gap-1">
              {/* 라운드 라벨 */}
              <span className={cn(
                'text-[10px] font-medium transition-colors',
                isCurrentRound ? 'text-primary' :
                isCompletedRound ? 'text-primary/60' :
                'text-muted-foreground/40',
              )}>
                {cfg.label}
              </span>
              {/* 매치 dots or checkmark */}
              {isCompletedRound ? (
                <Check className="w-3 h-3 text-primary" />
              ) : isCurrentRound ? (
                <div className="flex gap-0.5">
                  {Array.from({ length: cfg.count }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-all duration-300',
                        i < matchInRound ? 'bg-primary' :
                        i === matchInRound ? 'bg-primary scale-125' :
                        'bg-muted-foreground/20',
                      )}
                    />
                  ))}
                </div>
              ) : isPastRound ? null : (
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(cfg.count, 4) }, (_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/15" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
          key={match.imageA.id} /* [CL-WORLDCUP-IMG-ALGO-20260405-140000] */
          image={match.imageA}
          position="left"
          onSelect={() => handleSelect(match.imageA.id)}
          isWinner={getWinState(match.imageA.id)}
          disabled={isAnimating}
        />
        <WorldCupCard
          key={match.imageB.id} /* [CL-WORLDCUP-IMG-ALGO-20260405-140000] */
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
        마음에 드는 여행지를 탭해주세요
      </p>
    </div>
  );
}
