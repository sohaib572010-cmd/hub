import { getPublishedSite } from '@/lib/data/public';
import { siteUrl } from '@/lib/hosts';

export const revalidate = 86400;

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  if (!site || site.profile.seo.noindex) return new Response('Not found', { status: 404 });

  const lastmod = site.profile.updatedAt;
  const urls = [
    siteUrl(site.profile.slug, '/'),
    ...site.projects.map((p) => siteUrl(site.profile.slug, `/work/${p.id}`)),
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc><lastmod>${lastmod}</lastmod></url>`),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
