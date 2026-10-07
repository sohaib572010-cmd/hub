import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { Card, CardHeader } from '@/components/ui/primitives';
import { PasswordForm } from './PasswordForm';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted">Your administrator sign-in.</p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader title="Email" description="Used to sign in. Managed in Supabase Authentication." />
          <p className="px-5 py-4 font-mono text-[13px] sm:px-6">{admin.email}</p>
        </Card>
        <Card>
          <CardHeader
            title="Password"
            description="At least 12 characters. Changing it signs out every other device."
          />
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}
