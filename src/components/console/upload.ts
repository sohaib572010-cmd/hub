'use client';

import { getUploadSignature } from '@/app/console/_actions/profiles';
import type { Media } from '@/lib/types';

const ACCEPT = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'],
  video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'],
};

export const ACCEPT_ATTR = {
  image: ACCEPT.image.join(','),
  video: ACCEPT.video.join(','),
};

export function kindOf(file: File): 'image' | 'video' | null {
  if (ACCEPT.image.includes(file.type)) return 'image';
  if (ACCEPT.video.includes(file.type)) return 'video';
  return null;
}

/**
 * Upload straight from the browser to Cloudinary using a short-lived
 * server-issued signature. Files never pass through our servers.
 */
export async function uploadToCloudinary(
  profileId: string,
  file: File,
  kind: 'image' | 'video',
  onProgress?: (fraction: number) => void,
): Promise<Media> {
  if (kindOf(file) !== kind) {
    throw new Error(kind === 'image' ? 'Use a JPG, PNG, WebP, AVIF or HEIC image.' : 'Use an MP4, MOV, WebM or M4V video.');
  }

  const sig = await getUploadSignature(profileId, kind);
  if (!sig.ok) throw new Error(sig.error);
  const { url, fields, maxBytes } = sig.data;

  if (file.size > maxBytes) {
    throw new Error(`File is too large. Maximum is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  body.append('file', file);

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) resolve(xhr.response);
      else reject(new Error((xhr.response as { error?: { message?: string } })?.error?.message ?? 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });

  return {
    publicId: String(result.public_id),
    resourceType: result.resource_type === 'video' ? 'video' : 'image',
    version: Number(result.version),
    width: Number(result.width),
    height: Number(result.height),
    format: typeof result.format === 'string' ? result.format : undefined,
    duration: typeof result.duration === 'number' ? Math.round(result.duration * 10) / 10 : undefined,
  };
}
