'use server';

import { after } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase/admin';
import { siteTag } from '@/lib/data/public';
import { collectMedia, destroyMedia, destroyProfileFolder, removedMedia, signUpload } from '@/lib/cloudinary';
import { isValidSlug } from '@/lib/hosts';
import {
  createProfileSchema,
  profileContentSchema,
  slugSchema,
  statusSchema,
  uuidSchema,
  type ProfileContentInput,
} from '@/lib/schemas';
import { DEFAULT_SECTIONS, DEFAULT_THEME, type ProfileStatus } from '@/lib/types';
import { fail, fromZod, guard, ok, type ActionResult } from './result';

function invalidate(...slugs: string[]) {
  for (const slug of slugs) revalidateTag(siteTag(slug), { expire: 0 });
}

async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  let query = db().from('profiles').select('id').eq('slug', slug).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query;
  return Boolean(data && data.length > 0);
}

export async function checkSlug(
  raw: string,
  excludeId?: string,
): Promise<ActionResult<{ slug: string; available: boolean; message: string }>> {
  return guard(async () => {
    await requireAdmin();
    const slug = String(raw ?? '').trim().toLowerCase();
    if (!isValidSlug(slug)) {
      return ok({ slug, available: false, message: '3–40 lowercase letters, numbers or single hyphens' });
    }
    if (excludeId && !uuidSchema.safeParse(excludeId).success) return fail('Invalid profile');
    const taken = await slugTaken(slug, excludeId);
    return ok({ slug, available: !taken, message: taken ? 'Already in use' : 'Available' });
  });
}

export async function createProfile(input: { name: string; title: string; slug: string }): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin();
    const parsed = createProfileSchema.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);

    const { data, error } = await db()
      .from('profiles')
      .insert({
        name: parsed.data.name,
        title: parsed.data.title,
        slug: parsed.data.slug,
        sections: DEFAULT_SECTIONS,
        theme: DEFAULT_THEME,
        seo: {},
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return fail('That subdomain is already in use.', { slug: 'Already in use' });
      if (error.code === '23514') return fail('That subdomain is not allowed.', { slug: 'Not allowed' });
      throw error;
    }
    return ok({ id: data.id as string });
  });
}

export async function saveProfile(id: string, input: ProfileContentInput): Promise<ActionResult<{ updatedAt: string }>> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(id).success) return fail('Invalid profile');
    const parsed = profileContentSchema.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);
    const v = parsed.data;

    if (v.avatar && !v.avatar.publicId.startsWith(`hub/${id}/`)) return fail('Invalid image reference');

    const { data: before } = await db().from('profiles').select('slug,avatar').eq('id', id).maybeSingle();
    if (!before) return fail('Profile not found');

    const { data, error } = await db()
      .from('profiles')
      .update({
        name: v.name,
        title: v.title,
        short_bio: v.shortBio,
        full_bio: v.fullBio,
        location: v.location,
        email: v.email,
        phone: v.phone,
        availability: v.availability,
        avatar: v.avatar,
        social_links: v.socialLinks,
        skills: v.skills,
        services: v.services,
        experiences: v.experiences,
        clients: v.clients,
        sections: v.sections,
        theme: v.theme,
        seo: v.seo,
      })
      .eq('id', id)
      .select('updated_at')
      .single();
    if (error) throw error;

    invalidate(before.slug as string);
    const orphaned = removedMedia(collectMedia(before.avatar), collectMedia(v.avatar));
    if (orphaned.length) after(() => destroyMedia(orphaned));

    return ok({ updatedAt: data.updated_at as string });
  });
}

export async function updateSlug(id: string, raw: string): Promise<ActionResult<{ slug: string }>> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(id).success) return fail('Invalid profile');
    const parsed = slugSchema.safeParse(raw);
    if (!parsed.success) return fromZod(parsed.error);

    const { data: before } = await db().from('profiles').select('slug').eq('id', id).maybeSingle();
    if (!before) return fail('Profile not found');
    if (before.slug === parsed.data) return ok({ slug: parsed.data });

    const { error } = await db().from('profiles').update({ slug: parsed.data }).eq('id', id);
    if (error) {
      if (error.code === '23505') return fail('That subdomain is already in use.');
      throw error;
    }
    invalidate(before.slug as string, parsed.data);
    return ok({ slug: parsed.data });
  });
}

export async function setStatus(id: string, status: ProfileStatus): Promise<ActionResult<{ status: ProfileStatus }>> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(id).success) return fail('Invalid profile');
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) return fail('Invalid status');

    const patch: Record<string, unknown> = { status: parsed.data };
    if (parsed.data === 'published') patch.published_at = new Date().toISOString();

    const { data, error } = await db().from('profiles').update(patch).eq('id', id).select('slug').maybeSingle();
    if (error) throw error;
    if (!data) return fail('Profile not found');
    invalidate(data.slug as string);
    return ok({ status: parsed.data });
  });
}

export async function deleteProfile(id: string, confirmSlug: string): Promise<ActionResult> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(id).success) return fail('Invalid profile');

    const { data: before } = await db().from('profiles').select('slug').eq('id', id).maybeSingle();
    if (!before) return fail('Profile not found');
    if (String(confirmSlug).trim().toLowerCase() !== before.slug) {
      return fail('Type the subdomain exactly to confirm.');
    }

    const { error } = await db().from('profiles').delete().eq('id', id);
    if (error) throw error;

    invalidate(before.slug as string);
    after(() => destroyProfileFolder(id));
    return ok(undefined);
  });
}

export async function getUploadSignature(
  profileId: string,
  kind: 'image' | 'video',
): Promise<ActionResult<ReturnType<typeof signUpload>>> {
  return guard(async () => {
    await requireAdmin();
    if (!uuidSchema.safeParse(profileId).success) return fail('Invalid profile');
    if (kind !== 'image' && kind !== 'video') return fail('Invalid upload type');
    const { data } = await db().from('profiles').select('id').eq('id', profileId).maybeSingle();
    if (!data) return fail('Profile not found');
    return ok(signUpload(profileId, kind));
  });
}
