/**
 * [CL-HONEYMOON-REDESIGN-20260316] 월드컵 이미지 카드
 * blur-up 로딩, win/lose 애니메이션, 접근성
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { WorldCupImage } from '@/lib/honeymoon-images';

interface WorldCupCardProps {
  image: WorldCupImage;
  position: 'left' | 'right';
  onSelect: () => void;
  isWinner: boolean | null; // null=미결정, true=승, false=패
  disabled: boolean;
}

export function WorldCupCard({
  image,
  position,
  onSelect,
  isWinner,
  disabled,
}: WorldCupCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative w-full aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300',
        'border-2 border-transparent',
        'hover:border-primary/50 hover:shadow-toss-lg',
        'active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        // Win/lose 애니메이션
        isWinner === true && 'animate-wc-winner-pulse border-primary shadow-primary-glow',
        isWinner === false && (position === 'left' ? 'animate-wc-slide-out-left' : 'animate-wc-slide-out-right'),
        disabled && isWinner === null && 'opacity-50 pointer-events-none',
      )}
      aria-label={image.label}
    >
      {/* Blur thumbnail placeholder */}
      {!imgLoaded && (
        <img
          src={image.thumbUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          aria-hidden="true"
        />
      )}

      {/* Full image */}
      <img
        src={image.url}
        alt={image.label}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
          imgLoaded ? 'opacity-100' : 'opacity-0',
        )}
        loading="eager"
        onLoad={() => setImgLoaded(true)}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white text-sm font-bold leading-tight">
          {image.label}
        </p>
        <p className="text-white/70 text-xs mt-0.5">
          {image.subLabel}
        </p>
      </div>
    </button>
  );
}
