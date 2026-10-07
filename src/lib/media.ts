import type { Media } from './types';

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const BASE = `https://res.cloudinary.com/${CLOUD}`;

interface ImageOptions {
  width: number;
  height?: number;
  crop?: 'fill' | 'limit';
  quality?: 'auto' | 'auto:good' | 'auto:eco';
}

/**
 * Build a Cloudinary delivery URL. Format and quality are negotiated per
 * browser (AVIF/WebP), and width is clamped to the source so we never upscale.
 */
export function imageUrl(media: Media, { width, height, crop = 'limit', quality = 'auto' }: ImageOptions): string {
  const w = Math.min(Math.round(width), media.width);
  const parts = ['f_auto', `q_${quality}`, `c_${crop}`, `w_${w}`];
  if (height) parts.push(`h_${Math.round(height * (w / width))}`);
  if (crop === 'fill') parts.push('g_auto');
  const type = media.resourceType === 'video' ? 'video' : 'image';
  const suffix = media.resourceType === 'video' ? '.jpg' : '';
  return `${BASE}/${type}/upload/${parts.join(',')}/v${media.version}/${media.publicId}${suffix}`;
}

const WIDTHS = [320, 480, 640, 828, 1080, 1280, 1600, 1920, 2400];

export function imageSrcSet(media: Media, opts: { aspect?: number; crop?: 'fill' | 'limit'; max?: number } = {}) {
  const max = Math.min(opts.max ?? 2400, media.width);
  const widths = WIDTHS.filter((w) => w <= max);
  if (widths.length === 0 || widths[widths.length - 1] < max) widths.push(max);
  return widths
    .map((w) => {
      const h = opts.aspect ? Math.round(w / opts.aspect) : undefined;
      return `${imageUrl(media, { width: w, height: h, crop: opts.crop })} ${w}w`;
    })
    .join(', ');
}

/** Adaptive-quality MP4 for uploaded videos, capped to 1080p. */
export function videoUrl(media: Media): string {
  return `${BASE}/video/upload/f_auto:video,q_auto,c_limit,w_1920,h_1920/v${media.version}/${media.publicId}`;
}

export function videoPoster(media: Media, width = 1280): string {
  return `${BASE}/video/upload/so_0,f_auto,q_auto,c_limit,w_${width}/v${media.version}/${media.publicId}.jpg`;
}

/** Parse a YouTube or Vimeo link into a safe embed reference. */
export function parseVideoLink(input: string): { kind: 'youtube' | 'vimeo'; id: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1, 12);
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { kind: 'youtube', id } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id =
      url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1] ?? '';
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { kind: 'youtube', id } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.match(/(\d{6,12})/)?.[1];
    return id ? { kind: 'vimeo', id } : null;
  }
  return null;
}

export function embedUrl(video: { kind: 'youtube' | 'vimeo'; id: string }): string {
  return video.kind === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`
    : `https://player.vimeo.com/video/${video.id}?dnt=1&title=0&byline=0&portrait=0`;
}
