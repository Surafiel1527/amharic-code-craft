import { useEffect, RefObject } from 'react';

interface KeyboardNavigationOptions {
  containerRef: RefObject<HTMLElement>;
  onEnter?: (element: HTMLElement) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  containerRef,
  onEnter,
  onEscape,
  enabled = true,
}: KeyboardNavigationOptions) {
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) return;

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < focusableElements.length - 1) {
            focusableElements[currentIndex + 1]?.focus();
          } else {
            focusableElements[0]?.focus();
          }
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            focusableElements[currentIndex - 1]?.focus();
          } else {
            focusableElements[focusableElements.length - 1]?.focus();
          }
          break;

        case 'Enter':
          if (onEnter && document.activeElement) {
            e.preventDefault();
            onEnter(document.activeElement as HTMLElement);
          }
          break;

        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;

        case 'Home':
          e.preventDefault();
          focusableElements[0]?.focus();
          break;

        case 'End':
          e.preventDefault();
          focusableElements[focusableElements.length - 1]?.focus();
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, onEnter, onEscape, enabled]);
}