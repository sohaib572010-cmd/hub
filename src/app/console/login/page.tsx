import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Only verified admins skip the form; any other session simply sees it.
  if (await getAdmin()) redirect('/');
  const { next } = await searchParams;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <Logo />
          Hub Console
        </div>

        <div className="mx-auto w-full max-w-sm py-16">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted">Restricted to authorized administrators.</p>
          <LoginForm next={typeof next === 'string' ? next : undefined} />
        </div>

        <p className="text-[12px] text-faint">Protected area. Sign-in attempts are rate-limited.</p>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(15,122,98,0.35),transparent_55%),radial-gradient(90%_70%_at_0%_100%,rgba(228,87,46,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="max-w-md font-serif text-[2.75rem] leading-[1.05] tracking-tight">
            Every portfolio, its own address. <span className="text-white/50">All of them, one place.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#151513" />
      <path d="M10 9v14M22 9v14M10 16h12" stroke="#f1efea" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
