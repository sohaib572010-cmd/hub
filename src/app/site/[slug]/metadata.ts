import type { Metadata } from 'next';
import { imageUrl } from '@/lib/media';
import { siteUrl } from '@/lib/hosts';
import type { PublicSite } from '@/lib/data/public';
import type { Project } from '@/lib/types';

export function buildSiteMetadata({ profile, projects }: PublicSite, project?: Project): Metadata {
  const baseTitle = profile.seo.title || [profile.name, profile.title].filter(Boolean).join(' — ');
  const title = project ? `${project.title} — ${profile.name}` : baseTitle;
  const description =
    (project ? project.description.slice(0, 160) : '') ||
    profile.seo.description ||
    profile.shortBio.slice(0, 160) ||
    undefined;
  const ogSource = project?.cover ?? profile.avatar ?? projects.find((p) => p.cover)?.cover ?? null;
  const images = ogSource
    ? [{ url: imageUrl(ogSource, { width: 1200, height: 630, crop: 'fill' }), width: 1200, height: 630 }]
    : undefined;
  const url = siteUrl(profile.slug, project ? `/work/${project.id}` : '/');

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: profile.seo.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: project ? 'article' : 'profile', title, description, url, images },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images: images?.map((i) => i.url) },
  };
}
