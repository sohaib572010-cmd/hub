import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth';
import { getProfileWithProjects } from '@/lib/data/console';
import { uuidSchema } from '@/lib/schemas';
import { SiteEditor } from './SiteEditor';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireAdminPage();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return { title: 'Not found' };
  const data = await getProfileWithProjects(id);
  return { title: data ? data.profile.name : 'Not found' };
}

export default async function EditorPage({ params }: Params) {
  await requireAdminPage();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const data = await getProfileWithProjects(id);
  if (!data) notFound();
  return <SiteEditor key={data.profile.id} profile={data.profile} projects={data.projects} />;
}
