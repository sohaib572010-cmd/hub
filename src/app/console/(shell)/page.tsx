import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth';
import { getMetrics, listProfiles } from '@/lib/data/console';
import { SitesDashboard } from './SitesDashboard';

export const metadata: Metadata = { title: 'Portfolios' };

export default async function DashboardPage() {
  await requireAdminPage();
  const [profiles, metrics] = await Promise.all([listProfiles(), getMetrics()]);
  return <SitesDashboard profiles={profiles} metrics={metrics} />;
}
