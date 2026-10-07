import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth';
import { getProfileWithProjects } from '@/lib/data/console';
import { uuidSchema } from '@/lib/schemas';
import { ProjectDetail } from '@/components/portfolio/ProjectDetail';
import { PreviewBar } from '../../PreviewBar';

export const metadata: Metadata = { title: 'Preview' };

export default async function PreviewProjectPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  await requireAdminPage();
  const { id, projectId } = await params;
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(projectId).success) notFound();
  const data = await getProfileWithProjects(id);
  if (!data) notFound();

  const visible = data.projects.filter((p) => !p.isHidden || p.id === projectId);
  const index = visible.findIndex((p) => p.id === projectId);
  if (index === -1) notFound();
  const next = visible.length > 1 ? visible[(index + 1) % visible.length] : null;

  return (
    <>
      <PreviewBar id={id} slug={data.profile.slug} status={data.profile.status} />
      <ProjectDetail profile={data.profile} project={visible[index]} next={next} hrefBase={`/preview/${id}`} />
    </>
  );
}
