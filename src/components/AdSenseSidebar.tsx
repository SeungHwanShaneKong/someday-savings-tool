import { forwardRef, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdSenseSidebarProps {
  className?: string;
}

export const AdSenseSidebar = forwardRef<HTMLDivElement, AdSenseSidebarProps>(function AdSenseSidebar({ className }, forwardedRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInitialized = useRef(false);
  const location = useLocation();

  const initAd = useCallback(() => {
    if (!containerRef.current) return;

    // Clear previous ad on route change
    const container = containerRef.current;
    container.innerHTML = '';
    adInitialized.current = false;

    // Create fresh ins element
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.width = '100%';
    ins.style.minHeight = '250px';
    ins.setAttribute('data-ad-client', 'ca-pub-9490211917581890');
    ins.setAttribute('data-ad-slot', '3812194717');
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    container.appendChild(ins);

    // Wait for adsbygoogle script to be ready, then push
    const tryPush = () => {
      try {
        if (window.adsbygoogle && !adInitialized.current) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          adInitialized.current = true;
        }
      } catch {
        // Script not ready yet
      }
    };

    // Try immediately, then retry after a short delay if script isn't loaded
    tryPush();
    if (!adInitialized.current) {
      const timer = setTimeout(tryPush, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Re-initialize ad on route change
  useEffect(() => {
    const cleanup = initAd();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [location.pathname, initAd]);

  return (
    <div
      ref={(node) => {
        // [CL-PREVIEW-SYNC-20260403-120830] Forward incoming refs to avoid dev ref warnings in layout wrappers
        containerRef.current = node;

        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      className={className}
    />
  );
});
