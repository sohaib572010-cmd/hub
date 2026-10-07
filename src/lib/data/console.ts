import 'server-only';
import { db } from '@/lib/supabase/admin';
import { PROFILE_COLUMNS, PROJECT_COLUMNS, toProfile, toProject } from '@/lib/mappers';
import type { Metrics, Profile, ProfileSummary, Project } from '@/lib/types';

// Console reads are always fresh and only run after requireAdmin*().

export async function listProfiles(): Promise<ProfileSummary[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('id,slug,name,title,avatar,status,views,updated_at,projects(count)')
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title,
    avatar: row.avatar,
    status: row.status,
    views: Number(row.views ?? 0),
    updatedAt: row.updated_at,
    projectCount: (row.projects as { count: number }[] | undefined)?.[0]?.count ?? 0,
  }));
}

export async function getMetrics(): Promise<Metrics> {
  const { data, error } = await db().rpc('dashboard_metrics').single<Record<string, number>>();
  if (error || !data) return { total: 0, published: 0, draft: 0, archived: 0, views: 0 };
  return {
    total: Number(data.total),
    published: Number(data.published),
    draft: Number(data.draft),
    archived: Number(data.archived),
    views: Number(data.views),
  };
}

export async function getProfileWithProjects(id: string): Promise<{ profile: Profile; projects: Project[] } | null> {
  const { data, error } = await db()
    .from('profiles')
    .select(`${PROFILE_COLUMNS},projects(${PROJECT_COLUMNS})`)
    .eq('id', id)
    .order('position', { referencedTable: 'projects', ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const projects = ((data as { projects?: unknown[] }).projects ?? []).map((row) => toProject(row as never));
  return { profile: toProfile(data), projects };
}
