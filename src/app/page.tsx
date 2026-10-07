import type { Metadata } from 'next';
import { ROOT_DOMAIN } from '@/lib/hosts';

export const metadata: Metadata = {
  title: 'Hub — Portfolio sites for creative professionals',
  description: 'Considered, fast portfolio sites. Each one lives at its own address and belongs to one person.',
};

const host = ROOT_DOMAIN.replace(/:\d+$/, '');

export default function Home() {
  return (
    <div className="portfolio flex min-h-dvh flex-col" data-mode="dark" data-accent="ember" data-heading="serif">
      <header className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <span className="flex items-center gap-2.5 text-[0.95rem] font-medium tracking-tight">
          <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M10 9v14M22 9v14M10 16h12" stroke="var(--p-bg)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          Hub
        </span>
        <span className="eyebrow text-[var(--p-muted)]">By invitation</span>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-5 py-20 sm:px-8 lg:px-12">
        <p className="eyebrow mb-8 text-[var(--p-accent)]">Portfolio sites</p>
        <h1 className="display max-w-6xl text-[clamp(3.25rem,10vw,9.5rem)]">
          One person. <em className="text-[var(--p-muted)]">One address.</em> Nothing in the way of the work.
        </h1>

        <div className="mt-20 grid gap-10 border-t border-[var(--p-line)] pt-10 md:grid-cols-3">
          {[
            ['Their own address', `Every portfolio is published at name.${host} — private, independent, and never listed.`],
            ['Built for the work', 'Large-format imagery and film, editorial typography, and nothing competing for attention.'],
            ['Fast everywhere', 'Pages are pre-rendered and served from the edge, with images sized for every screen.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h2 className="mb-3 text-lg font-medium tracking-tight">{title}</h2>
              <p className="leading-relaxed text-[var(--p-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1440px] px-5 py-8 text-sm text-[var(--p-muted)] sm:px-8 lg:px-12">
        &copy; {new Date().getFullYear()} Hub
      </footer>
    </div>
  );
}
