export type ProfileStatus = 'draft' | 'published' | 'archived';

/** A Cloudinary asset reference. URLs are always built from this, never stored. */
export interface Media {
  publicId: string;
  resourceType: 'image' | 'video';
  version: number;
  width: number;
  height: number;
  format?: string;
  duration?: number;
}

export type VideoSource =
  | { kind: 'upload'; media: Media }
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string };

export const SOCIAL_PLATFORMS = [
  'website', 'instagram', 'linkedin', 'behance', 'dribbble', 'x', 'youtube',
  'vimeo', 'github', 'facebook', 'tiktok', 'other',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  label?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface ClientItem {
  id: string;
  name: string;
  url?: string;
}

export const SECTION_KEYS = ['about', 'expertise', 'work', 'experience', 'clients', 'contact'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export interface SectionConfig {
  key: SectionKey;
  visible: boolean;
  heading?: string;
  /** Optional lead line; for Contact it replaces the closing headline. */
  intro?: string;
}

export const ACCENTS = ['ember', 'saffron', 'teal', 'cobalt', 'moss', 'mono'] as const;
export type Accent = (typeof ACCENTS)[number];

export interface Theme {
  mode: 'dark' | 'light';
  accent: Accent;
  headingFont: 'serif' | 'sans';
  heroStyle: 'portrait' | 'type';
  workLayout: 'editorial' | 'grid' | 'list';
}

export interface Seo {
  title?: string;
  description?: string;
  noindex?: boolean;
}

export interface Profile {
  id: string;
  slug: string;
  name: string;
  title: string;
  shortBio: string;
  fullBio: string;
  location: string;
  email: string;
  phone: string;
  availability: string;
  avatar: Media | null;
  socialLinks: SocialLink[];
  skills: string[];
  services: ServiceItem[];
  experiences: ExperienceItem[];
  clients: ClientItem[];
  sections: SectionConfig[];
  theme: Theme;
  seo: Seo;
  status: ProfileStatus;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  profileId: string;
  title: string;
  category: string;
  description: string;
  cover: Media | null;
  gallery: Media[];
  video: VideoSource | null;
  tools: string[];
  clientName: string;
  projectDate: string;
  link: string;
  position: number;
  isHidden: boolean;
  featured: boolean;
}

export interface ProfileSummary {
  id: string;
  slug: string;
  name: string;
  title: string;
  avatar: Media | null;
  status: ProfileStatus;
  views: number;
  updatedAt: string;
  projectCount: number;
}

export interface Metrics {
  total: number;
  published: number;
  draft: number;
  archived: number;
  views: number;
}

export const DEFAULT_THEME: Theme = {
  mode: 'dark',
  accent: 'ember',
  headingFont: 'serif',
  heroStyle: 'portrait',
  workLayout: 'editorial',
};

export const DEFAULT_SECTIONS: SectionConfig[] = SECTION_KEYS.map((key) => ({ key, visible: true }));

export const SECTION_LABELS: Record<SectionKey, string> = {
  about: 'About',
  expertise: 'Expertise',
  work: 'Selected work',
  experience: 'Experience',
  clients: 'Clients',
  contact: 'Contact',
};
