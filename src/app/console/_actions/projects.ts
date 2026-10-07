'use server';

import { after } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase/admin';
import { siteTag } from '@/lib/data/public';
import { collectMedia, destroyMedia, removedMedia } from '@/lib/cloudinary';
import { PROJECT_COLUMNS, toProject } from '@/lib/mappers';
import { projectSchema, uuidSchema, type ProjectInput } from '@/lib/schemas';
import type { Project } from '@/lib/types';
import { fail, fromZod, guard, ok, type ActionResult } from './result';

async function profileSlug(profileId: string): Promise<string | null> {
  const { data } = await db().from('profiles').select('slug').eq('id', profileId).maybeSingle();
  return (data?.slug as string) ?? null;
}

function mediaBelongsTo(profileId: string, input: ProjectInput): boolean {
  const prefix = `hub/${profileId}/`;
  return collectMedia(input.cover, input.gallery, input.video).every((m) => m.publicId.startsWith(prefix));
}

function toRow(v: ProjectInput) {
  return {
    title: v.title,
    category: v.category,
    description: v.description,
    cover: v.cover,
    gallery: v.gallery,
    video: v.video,
    tools: v.tools,
    client_name: v.clientName,
    project_date: v.projectDate,
    link: v.link,
    is_hidden: v.isHidden,
    featured: v.featured,
  };
}

export async function createProject(profileId: string, input: ProjectInput): Promise<ActionResult<Project>> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(profileId).success) return fail('Invalid profile');
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);
    if (!mediaBelongsTo(profileId, parsed.data)) return fail('Invalid media reference');

    const slug = await profileSlug(profileId);
    if (!slug) return fail('Profile not found');

    const { data: last } = await db()
      .from('projects')
      .select('position')
      .eq('profile_id', profileId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await db()
      .from('projects')
      .insert({ ...toRow(parsed.data), profile_id: profileId, position: ((last?.position as number) ?? 0) + 1 })
      .select(PROJECT_COLUMNS)
      .single();
    if (error) throw error;

    revalidateTag(siteTag(slug), { expire: 0 });
    return ok(toProject(data));
  });
}

export async function updateProject(projectId: string, input: ProjectInput): Promise<ActionResult<Project>> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(projectId).success) return fail('Invalid project');
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);

    const { data: before } = await db()
      .from('projects')
      .select('profile_id,cover,gallery,video')
      .eq('id', projectId)
      .maybeSingle();
    if (!before) return fail('Project not found');
    const profileId = before.profile_id as string;
    if (!mediaBelongsTo(profileId, parsed.data)) return fail('Invalid media reference');

    const { data, error } = await db()
      .from('projects')
      .update(toRow(parsed.data))
      .eq('id', projectId)
      .select(PROJECT_COLUMNS)
      .single();
    if (error) throw error;

    const slug = await profileSlug(profileId);
    if (slug) revalidateTag(siteTag(slug), { expire: 0 });

    const orphaned = removedMedia(
      collectMedia(before.cover, before.gallery, before.video),
      collectMedia(parsed.data.cover, parsed.data.gallery, parsed.data.video),
    );
    if (orphaned.length) after(() => destroyMedia(orphaned));
    return ok(toProject(data));
  });
}

export async function setProjectHidden(projectId: string, hidden: boolean): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(projectId).success) return fail('Invalid project');
    const { data, error } = await db()
      .from('projects')
      .update({ is_hidden: Boolean(hidden) })
      .eq('id', projectId)
      .select('profile_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail('Project not found');
    const slug = await profileSlug(data.profile_id as string);
    if (slug) revalidateTag(siteTag(slug), { expire: 0 });
    return ok(undefined);
  });
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(projectId).success) return fail('Invalid project');
    const { data: before, error } = await db()
      .from('projects')
      .delete()
      .eq('id', projectId)
      .select('profile_id,cover,gallery,video')
      .maybeSingle();
    if (error) throw error;
    if (!before) return fail('Project not found');

    const slug = await profileSlug(before.profile_id as string);
    if (slug) revalidateTag(siteTag(slug), { expire: 0 });
    const media = collectMedia(before.cover, before.gallery, before.video);
    if (media.length) after(() => destroyMedia(media));
    return ok(undefined);
  });
}

export async function reorderProjects(profileId: string, ids: string[]): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    const parsed = z.object({ profileId: uuidSchema, ids: z.array(uuidSchema).max(500) }).safeParse({ profileId, ids });
    if (!parsed.success) return fail('Invalid order');

    const { error } = await db().rpc('reorder_projects', { p_profile_id: profileId, p_ids: parsed.data.ids });
    if (error) throw error;

    const slug = await profileSlug(profileId);
    if (slug) revalidateTag(siteTag(slug), { expire: 0 });
    return ok(undefined);
  });
}
