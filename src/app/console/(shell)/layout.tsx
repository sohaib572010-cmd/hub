import { requireAdminPage } from '@/lib/auth';
import { Sidebar } from './Sidebar';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar email={admin.email} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
