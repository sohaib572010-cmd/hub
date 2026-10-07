import { getPublishedSite } from '@/lib/data/public';
import { siteUrl } from '@/lib/hosts';

export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  const body =
    !site || site.profile.seo.noindex
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl(site.profile.slug, '/sitemap.xml')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
