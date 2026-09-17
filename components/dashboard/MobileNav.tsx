'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AICore } from '@/components/beyza/core/AICore';

const ITEMS = [
  { href: '/dashboard', label: 'Ana Sayfa', icon: '⌂' },
  { href: '/dashboard/leads', label: 'Lead', icon: '☺' },
  { href: '/dashboard/calendar', label: 'Takvim', icon: '▦' },
  { href: '/dashboard/quotes', label: 'Teklif', icon: '▤' },
];

/**
 * Dedicated mobile UX (section 15) rather than a shrunk desktop layout: a
 * bottom bar with the day-to-day sections plus a prominent, elevated central
 * BEYZA button that opens the full-screen voice/call mode
 * (app/dashboard/beyza/page.tsx) — mirroring how a phone app puts its
 * primary action front and center instead of buried in a hamburger menu.
 */
export function MobileNav() {
  const pathname = usePathname();

  // The full-screen voice/call mode (redesign #15/#23) is its own immersive
  // surface with its own end-call control — the regular bottom nav would
  // otherwise render on top of it (both are `fixed ... z-40`, and this one
  // paints later in the DOM) and cover its mic/speaker/end-call buttons.
  if (pathname === '/dashboard/beyza') return null;

  return (
    <nav className="glass-panel fixed inset-x-0 bottom-0 z-40 flex items-center justify-between px-2 pb-[env(safe-area-inset-bottom)] sm:hidden">
      {ITEMS.slice(0, 2).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
            pathname === item.href ? 'text-accent' : 'text-muted'
          }`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}

      <Link
        href="/dashboard/beyza"
        aria-label="Beyza'yı aç"
        className="relative -top-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-accent/60 bg-surface shadow-glow-md"
      >
        <AICore state="ready" size="sm" />
      </Link>

      {ITEMS.slice(2).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
            pathname === item.href ? 'text-accent' : 'text-muted'
          }`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
