import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Portfolio } from '@/components/portfolio/Portfolio';
import { ViewBeacon } from '@/components/portfolio/client';
import { getPublishedSite } from '@/lib/data/public';
import { buildSiteMetadata } from './metadata';

// Statically generated on first request, then served from cache until an
// admin edit invalidates it (or after a day as a safety net).
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  if (!site) return { title: 'Not found', robots: { index: false } };
  return buildSiteMetadata(site);
}

export default async function SitePage({ params }: Params) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  if (!site) notFound();

  const { profile, projects } = site;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.title || undefined,
    description: profile.shortBio || undefined,
    address: profile.location || undefined,
    sameAs: profile.socialLinks.map((l) => l.url),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so user content can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Portfolio profile={profile} projects={projects} />
      <ViewBeacon />
    </>
  );
}
