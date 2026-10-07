import 'server-only';
import { createHash } from 'node:crypto';
import { serverEnv } from '@/lib/env';
import type { Media } from '@/lib/types';

const API = () => `https://api.cloudinary.com/v1_1/${serverEnv.cloudinaryCloudName}`;

function sign(params: Record<string, string | number>): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(payload + serverEnv.cloudinaryApiSecret).digest('hex');
}

export const UPLOAD_RULES = {
  image: { formats: 'jpg,jpeg,png,webp,avif,heic', maxBytes: 15 * 1024 * 1024 },
  video: { formats: 'mp4,mov,webm,m4v', maxBytes: 100 * 1024 * 1024 },
} as const;

export function profileFolder(profileId: string) {
  return `hub/${profileId}`;
}

/**
 * Parameters for a direct browser-to-Cloudinary signed upload. The signature
 * pins the folder, formats and an incoming size limit, so the browser cannot
 * write anywhere else or change those settings.
 */
export function signUpload(profileId: string, kind: 'image' | 'video') {
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    allowed_formats: UPLOAD_RULES[kind].formats,
    folder: profileFolder(profileId),
    timestamp,
    unique_filename: 'true',
    use_filename: 'false',
    overwrite: 'false',
  };
  // Downscale oversized images on ingest so storage stays lean.
  if (kind === 'image') params.transformation = 'c_limit,w_2800,h_2800';

  return {
    url: `${API()}/${kind}/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      api_key: serverEnv.cloudinaryApiKey,
      signature: sign(params),
    },
    maxBytes: UPLOAD_RULES[kind].maxBytes,
  };
}

function basicAuth() {
  return 'Basic ' + Buffer.from(`${serverEnv.cloudinaryApiKey}:${serverEnv.cloudinaryApiSecret}`).toString('base64');
}

/** Delete individual assets. Best-effort: failures are logged, never thrown. */
export async function destroyMedia(items: Media[]): Promise<void> {
  const byType = new Map<'image' | 'video', string[]>();
  for (const item of items) {
    const list = byType.get(item.resourceType) ?? [];
    list.push(item.publicId);
    byType.set(item.resourceType, list);
  }
  await Promise.all(
    [...byType].map(async ([type, ids]) => {
      for (let i = 0; i < ids.length; i += 100) {
        const query = ids
          .slice(i, i + 100)
          .map((id) => `public_ids[]=${encodeURIComponent(id)}`)
          .join('&');
        try {
          const res = await fetch(`${API()}/resources/${type}/upload?${query}&invalidate=true`, {
            method: 'DELETE',
            headers: { Authorization: basicAuth() },
          });
          if (!res.ok) console.error('[cloudinary] delete failed', res.status);
        } catch (err) {
          console.error('[cloudinary] delete error', err);
        }
      }
    }),
  );
}

/** Remove everything stored for a profile (used when a profile is deleted). */
export async function destroyProfileFolder(profileId: string): Promise<void> {
  const prefix = `${profileFolder(profileId)}/`;
  for (const type of ['image', 'video'] as const) {
    try {
      await fetch(`${API()}/resources/${type}/upload?prefix=${encodeURIComponent(prefix)}&invalidate=true`, {
        method: 'DELETE',
        headers: { Authorization: basicAuth() },
      });
    } catch (err) {
      console.error('[cloudinary] prefix delete error', err);
    }
  }
  try {
    await fetch(`${API()}/folders/${encodeURIComponent(profileFolder(profileId))}`, {
      method: 'DELETE',
      headers: { Authorization: basicAuth() },
    });
  } catch {
    // Folder may not exist or may still be settling; harmless.
  }
}

/** Every media item referenced by a profile row or project row. */
export function collectMedia(...values: unknown[]): Media[] {
  const found: Media[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(visit);
    const obj = value as Record<string, unknown>;
    if (typeof obj.publicId === 'string' && (obj.resourceType === 'image' || obj.resourceType === 'video')) {
      found.push(obj as unknown as Media);
      return;
    }
    Object.values(obj).forEach(visit);
  };
  values.forEach(visit);
  return found;
}

/** Media present in `before` but absent from `after`. */
export function removedMedia(before: Media[], after: Media[]): Media[] {
  const keep = new Set(after.map((m) => m.publicId));
  const seen = new Set<string>();
  return before.filter((m) => !keep.has(m.publicId) && !seen.has(m.publicId) && seen.add(m.publicId));
}
