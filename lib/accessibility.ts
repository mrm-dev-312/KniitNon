"use client";

import { useEffect, useRef } from 'react';

/**
 * Accessibility utilities for keyboard navigation, focus management, and ARIA support
 */

// Key codes for common keyboard interactions
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Hook to trap focus within a container (useful for modals, dropdowns)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== KEYS.TAB) return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === KEYS.ESCAPE) {
        const firstElement = focusableElements[0] as HTMLElement;
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // Focus the first element when the trap becomes active
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook to manage focus restoration after modal/dialog closes
 */
export function useFocusRestore() {
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    restoreFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (restoreFocusRef.current) {
      restoreFocusRef.current.focus();
      restoreFocusRef.current = null;
    }
  };

  return { saveFocus, restoreFocus };
}

/**
 * Hook for keyboard navigation in lists (arrow keys, home/end)
 */
export function useKeyboardNavigation(items: HTMLElement[] | null, isActive: boolean = true) {
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!isActive || !items || items.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case KEYS.ARROW_DOWN:
          e.preventDefault();
          currentIndexRef.current = Math.min(currentIndexRef.current + 1, items.length - 1);
          items[currentIndexRef.current]?.focus();
          break;
        case KEYS.ARROW_UP:
          e.preventDefault();
          currentIndexRef.current = Math.max(currentIndexRef.current - 1, 0);
          items[currentIndexRef.current]?.focus();
          break;
        case KEYS.HOME:
          e.preventDefault();
          currentIndexRef.current = 0;
          items[0]?.focus();
          break;
        case KEYS.END:
          e.preventDefault();
          currentIndexRef.current = items.length - 1;
          items[items.length - 1]?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, isActive]);

  return currentIndexRef;
}

/**
 * Announces content to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generates unique IDs for ARIA relationships
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common ARIA attributes for interactive elements
 */
export const ariaAttributes = {
  button: (pressed?: boolean, expanded?: boolean, controls?: string) => ({
    role: 'button',
    'aria-pressed': pressed !== undefined ? pressed : undefined,
    'aria-expanded': expanded !== undefined ? expanded : undefined,
    'aria-controls': controls,
    tabIndex: 0,
  }),
  
  listbox: (activeDescendant?: string, labelledBy?: string) => ({
    role: 'listbox',
    'aria-activedescendant': activeDescendant,
    'aria-labelledby': labelledBy,
    tabIndex: 0,
  }),
  
  option: (selected?: boolean, disabled?: boolean) => ({
    role: 'option',
    'aria-selected': selected !== undefined ? selected : undefined,
    'aria-disabled': disabled !== undefined ? disabled : undefined,
    tabIndex: -1,
  }),
  
  dialog: (labelledBy?: string, describedBy?: string) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    tabIndex: -1,
  }),
  
  region: (label?: string, labelledBy?: string) => ({
    role: 'region',
    'aria-label': label,
    'aria-labelledby': labelledBy,
  }),
};

/**
 * Screen reader only CSS class (add to global CSS)
 */
export const srOnlyClass = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
} as const;
