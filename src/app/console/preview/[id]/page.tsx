import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth';
import { getProfileWithProjects } from '@/lib/data/console';
import { uuidSchema } from '@/lib/schemas';
import { Portfolio } from '@/components/portfolio/Portfolio';
import { PreviewBar } from './PreviewBar';

export const metadata: Metadata = { title: 'Preview' };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const data = await getProfileWithProjects(id);
  if (!data) notFound();

  const visible = data.projects.filter((p) => !p.isHidden);
  return (
    <>
      <PreviewBar id={id} slug={data.profile.slug} status={data.profile.status} />
      <Portfolio profile={data.profile} projects={visible} hrefBase={`/preview/${id}`} />
    </>
  );
}
