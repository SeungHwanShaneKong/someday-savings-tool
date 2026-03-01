import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ChatFabProps {
  onClick: () => void;
}

/**
 * Global Q&A FAB — bottom-LEFT
 * CoffeeDonationFab pattern (bottom-RIGHT) reused but mirrored
 * Hidden on /chat page (full-screen chat) and when not authenticated
 */
export function ChatFab({ onClick }: ChatFabProps) {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on chat full-screen page, landing, and auth pages
  const hiddenPaths = ['/chat', '/', '/auth'];
  if (hiddenPaths.includes(location.pathname) || !user) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-40 group',
        // Position: bottom-LEFT (opposite of CoffeeDonationFab which is bottom-RIGHT)
        'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-3',
        'sm:bottom-8 sm:left-6',
        // Style
        'flex items-center gap-2 pl-3.5 pr-4 py-3 sm:py-3.5 rounded-full',
        'bg-gradient-to-r from-blue-600 to-primary',
        'text-white font-medium text-sm',
        'shadow-[0_4px_20px_rgba(0,80,200,0.4)]',
        'hover:shadow-[0_6px_30px_rgba(0,80,200,0.5)]',
        'hover:scale-105 active:scale-95',
        'transition-all duration-200 ease-out'
      )}
      aria-label="웨딩 Q&A 열기"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Q&A</span>
    </button>
  );
}
