// Host helpers shared by the proxy, server code, and the console UI.
// Only NEXT_PUBLIC_ values are read here so the module is safe in the browser.

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').toLowerCase();

export const IS_LOCAL_ROOT = /(^|\.)localhost(:\d+)?$/.test(ROOT_DOMAIN);

export const PROTOCOL = IS_LOCAL_ROOT ? 'http' : 'https';

/** Valid portfolio subdomain: 3-40 chars, lowercase letters, digits, inner hyphens. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

export const RESERVED_SLUGS = new Set([
  'admin', 'www', 'api', 'app', 'mail', 'email', 'smtp', 'ftp', 'cdn', 'static', 'assets',
  'dashboard', 'console', 'auth', 'login', 'status', 'help', 'support', 'docs', 'blog',
  'dev', 'staging', 'test', 'preview', 'root', 'hub', 'system', 'billing', 'account',
]);

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !slug.includes('--') && !RESERVED_SLUGS.has(slug);
}

export function siteUrl(slug: string, path = ''): string {
  return `${PROTOCOL}://${slug}.${ROOT_DOMAIN}${path}`;
}

export function siteHost(slug: string): string {
  return `${slug}.${ROOT_DOMAIN}`;
}

export function rootUrl(path = ''): string {
  return `${PROTOCOL}://${ROOT_DOMAIN}${path}`;
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export type HostKind =
  | { kind: 'root' }
  | { kind: 'admin' }
  | { kind: 'site'; slug: string }
  | { kind: 'invalid' };

/** Classify an incoming Host header against the configured root domain. */
export function classifyHost(rawHost: string | null, adminSubdomain: string): HostKind {
  const host = (rawHost ?? '').toLowerCase().trim();
  if (!host) return { kind: 'root' };

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return { kind: 'root' };
  if (host === `${adminSubdomain}.${ROOT_DOMAIN}`) return { kind: 'admin' };

  const suffix = `.${ROOT_DOMAIN}`;
  if (host.endsWith(suffix)) {
    const label = host.slice(0, -suffix.length);
    if (!label.includes('.') && isValidSlug(label)) return { kind: 'site', slug: label };
    return { kind: 'invalid' };
  }

  // Unknown hosts (e.g. platform preview URLs) behave like the root domain.
  return { kind: 'root' };
}
