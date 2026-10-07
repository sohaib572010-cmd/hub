import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/supabase/admin';
import { isValidSlug } from '@/lib/hosts';
import { PROFILE_COLUMNS, PROJECT_COLUMNS, toProfile, toProject } from '@/lib/mappers';
import type { Profile, Project } from '@/lib/types';

export interface PublicSite {
  profile: Omit<Profile, 'views'>;
  projects: Project[];
}

export const siteTag = (slug: string) => `site:${slug.toLowerCase()}`;

async function loadPublishedSite(slug: string): Promise<PublicSite | null> {
  const { data, error } = await db()
    .from('profiles')
    .select(`${PROFILE_COLUMNS},projects(${PROJECT_COLUMNS})`)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('projects.is_hidden', false)
    .order('position', { referencedTable: 'projects', ascending: true })
    .maybeSingle();

  if (error) throw new Error(`Failed to load site: ${error.message}`);
  if (!data) return null;

  const { views: _views, ...profile } = toProfile(data);
  const projects = ((data as { projects?: unknown[] }).projects ?? []).map((row) => toProject(row as never));
  return { profile, projects };
}

/**
 * Cached per slug. Pages are statically regenerated and invalidated on demand
 * whenever an admin saves, so the database is touched once per change rather
 * than once per visitor.
 */
export async function getPublishedSite(slug: string): Promise<PublicSite | null> {
  const normalized = slug.toLowerCase();
  if (!isValidSlug(normalized)) return null;
  return unstable_cache(() => loadPublishedSite(normalized), ['published-site', normalized], {
    tags: [siteTag(normalized)],
    revalidate: 86400,
  })();
}
