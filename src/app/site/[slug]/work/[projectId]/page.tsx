import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetail } from '@/components/portfolio/ProjectDetail';
import { getPublishedSite } from '@/lib/data/public';
import { buildSiteMetadata } from '../../metadata';

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string; projectId: string }> };

async function load(slug: string, projectId: string) {
  const site = await getPublishedSite(slug);
  if (!site) return null;
  const index = site.projects.findIndex((p) => p.id === projectId);
  if (index === -1) return null;
  const next = site.projects.length > 1 ? site.projects[(index + 1) % site.projects.length] : null;
  return { site, project: site.projects[index], next };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, projectId } = await params;
  const data = await load(slug, projectId);
  if (!data) return { title: 'Not found', robots: { index: false } };
  return buildSiteMetadata(data.site, data.project);
}

export default async function ProjectPage({ params }: Params) {
  const { slug, projectId } = await params;
  const data = await load(slug, projectId);
  if (!data) notFound();
  return <ProjectDetail profile={data.site.profile} project={data.project} next={data.next} />;
}
