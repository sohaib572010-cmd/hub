import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: { default: 'Hub Console', template: '%s · Hub Console' },
  robots: { index: false, follow: false, nocache: true },
};

export default function ConsoleRoot({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
