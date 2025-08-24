// Basic accessibility utilities (stub)

/** Generate a stable ARIA id from a label */
export function ariaId(label: string) {
  return 'aria-' + label.toLowerCase().replace(/[^a-z0-9]+/g,'-');
}

/** Trap focus inside a container (minimal, non-reactive stub) */
export function trapFocus(container: HTMLElement) {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  function handle(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener('keydown', handle);
  return () => container.removeEventListener('keydown', handle);
}
