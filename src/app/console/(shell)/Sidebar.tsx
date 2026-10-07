'use client';

import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import { LayoutGrid, LogOut, UserRound, ExternalLink } from 'lucide-react';
import { cn } from '@/components/ui/primitives';
import { rootUrl } from '@/lib/hosts';
import { logout } from '../_actions/auth';

const NAV = [
  { href: '/', label: 'Portfolios', icon: LayoutGrid, match: (s: string[]) => s.length === 0 || s[0] === 'sites' },
  { href: '/account', label: 'Account', icon: UserRound, match: (s: string[]) => s[0] === 'account' },
];

export function Sidebar({ email }: { email: string }) {
  const segments = useSelectedLayoutSegments();

  return (
    <aside className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur lg:h-dvh lg:border-b-0 lg:border-r lg:bg-surface">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:px-3 lg:py-4">
        <Link href="/" className="flex items-center gap-2.5 px-2 text-[15px] font-semibold tracking-tight lg:mb-6 lg:h-9">
          <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#151513" />
            <path d="M10 9v14M22 9v14M10 16h12" stroke="#f1efea" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          Hub
        </Link>

        <nav aria-label="Console" className="flex items-center gap-1 lg:flex-col lg:items-stretch">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(segments);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
                  active ? 'bg-subtle font-medium text-ink' : 'text-muted hover:bg-subtle/70 hover:text-ink',
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <a
            href={rootUrl('/')}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted transition-colors hover:bg-subtle/70 hover:text-ink lg:flex"
          >
            <ExternalLink className="size-4" aria-hidden />
            Public site
          </a>
        </nav>

        <div className="lg:mt-auto lg:border-t lg:border-line lg:pt-3">
          <p className="mb-2 hidden truncate px-2.5 text-[12px] text-muted lg:block" title={email}>
            {email}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-muted transition-colors hover:bg-subtle/70 hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
