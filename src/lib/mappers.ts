import {
  DEFAULT_SECTIONS,
  DEFAULT_THEME,
  SECTION_KEYS,
  type Media,
  type Profile,
  type Project,
  type SectionConfig,
  type Theme,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export const PROFILE_COLUMNS =
  'id,slug,name,title,short_bio,full_bio,location,email,phone,availability,avatar,social_links,skills,services,experiences,clients,sections,theme,seo,status,views,published_at,created_at,updated_at';

export const PROJECT_COLUMNS =
  'id,profile_id,title,category,description,cover,gallery,video,tools,client_name,project_date,link,position,is_hidden,featured';

/** Ensure every known section appears exactly once, keeping the stored order. */
export function normalizeSections(stored: unknown): SectionConfig[] {
  const list = Array.isArray(stored) ? (stored as SectionConfig[]) : [];
  const seen = new Set<string>();
  const result: SectionConfig[] = [];
  for (const item of list) {
    if (item && SECTION_KEYS.includes(item.key) && !seen.has(item.key)) {
      seen.add(item.key);
      result.push({ key: item.key, visible: Boolean(item.visible), heading: item.heading || undefined, intro: item.intro || undefined });
    }
  }
  for (const fallback of DEFAULT_SECTIONS) {
    if (!seen.has(fallback.key)) result.push({ ...fallback });
  }
  return result;
}

export function normalizeTheme(stored: unknown): Theme {
  return { ...DEFAULT_THEME, ...((stored as Partial<Theme>) ?? {}) };
}

export function toProfile(row: Row): Profile {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title ?? '',
    shortBio: row.short_bio ?? '',
    fullBio: row.full_bio ?? '',
    location: row.location ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    availability: row.availability ?? '',
    avatar: (row.avatar as Media) ?? null,
    socialLinks: row.social_links ?? [],
    skills: row.skills ?? [],
    services: row.services ?? [],
    experiences: row.experiences ?? [],
    clients: row.clients ?? [],
    sections: normalizeSections(row.sections),
    theme: normalizeTheme(row.theme),
    seo: row.seo ?? {},
    status: row.status,
    views: Number(row.views ?? 0),
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toProject(row: Row): Project {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    category: row.category ?? '',
    description: row.description ?? '',
    cover: row.cover ?? null,
    gallery: row.gallery ?? [],
    video: row.video ?? null,
    tools: row.tools ?? [],
    clientName: row.client_name ?? '',
    projectDate: row.project_date ?? '',
    link: row.link ?? '',
    position: row.position ?? 0,
    isHidden: Boolean(row.is_hidden),
    featured: Boolean(row.featured),
  };
}
