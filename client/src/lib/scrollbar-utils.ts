// Utility functions for managing scrollbar compensation to prevent layout shifts
import { useEffect } from 'react';

let scrollbarWidth: number | null = null;

/**
 * Calculate the scrollbar width by creating a temporary element
 */
export function getScrollbarWidth(): number {
  if (scrollbarWidth !== null) {
    return scrollbarWidth;
  }

  // Create a temporary div to measure scrollbar width
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  (outer.style as any).msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  outer.appendChild(inner);

  scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  document.body.removeChild(outer);

  return scrollbarWidth;
}

/**
 * Lock body scroll and compensate for scrollbar width to prevent layout shift
 */
export function lockBodyScroll(): void {
  const scrollWidth = getScrollbarWidth();
  const body = document.body;
  
  // Store current scroll position
  const scrollY = window.scrollY;
  
  // Apply styles to prevent scroll and compensate for scrollbar
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.paddingRight = `${scrollWidth}px`;
  body.style.overflow = 'hidden';
  
  // Store scroll position for restoration
  body.setAttribute('data-scroll-y', scrollY.toString());
}

/**
 * Unlock body scroll and restore original position
 */
export function unlockBodyScroll(): void {
  const body = document.body;
  const scrollY = body.getAttribute('data-scroll-y');
  
  // Remove all applied styles
  body.style.position = '';
  body.style.top = '';
  body.style.width = '';
  body.style.paddingRight = '';
  body.style.overflow = '';
  
  // Restore scroll position
  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY, 10));
    body.removeAttribute('data-scroll-y');
  }
}

/**
 * Hook for React components to manage body scroll lock
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    // Cleanup on unmount
    return () => {
      if (isLocked) {
        unlockBodyScroll();
      }
    };
  }, [isLocked]);
}