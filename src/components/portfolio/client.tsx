'use client';

import { useEffect, useState } from 'react';

/** Adds scroll-reveal once JS is available. Content stays visible without JS. */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('js');
    const items = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

/** Counts one view per browser session; the server de-duplicates further. */
export function ViewBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('hub:viewed')) return;
      sessionStorage.setItem('hub:viewed', '1');
    } catch {
      // Storage unavailable (private mode): fall through, server cookie still dedupes.
    }
    const send = () => {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/view');
      else fetch('/api/view', { method: 'POST', keepalive: true }).catch(() => {});
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(send);
    else setTimeout(send, 1500);
  }, []);
  return null;
}

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked; the mailto link remains available.
        }
      }}
    >
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}
