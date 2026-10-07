import type { SocialLink, SocialPlatform } from '@/lib/types';

export const SOCIAL_NAMES: Record<SocialPlatform, string> = {
  website: 'Website',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  behance: 'Behance',
  dribbble: 'Dribbble',
  x: 'X',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  github: 'GitHub',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  other: 'Link',
};

export function socialLabel(link: SocialLink): string {
  return link.label?.trim() || SOCIAL_NAMES[link.platform];
}
