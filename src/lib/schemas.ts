import { z } from 'zod';
import { ACCENTS, SECTION_KEYS, SOCIAL_PLATFORMS } from './types';
import { isValidSlug } from './hosts';

const text = (max: number) => z.string().trim().max(max);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/);

/** Only absolute http(s) URLs. Blocks javascript:, data:, and other schemes. */
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Enter a full URL starting with https://');

const optionalUrl = z.union([z.literal(''), safeUrl]);

export const mediaSchema = z.object({
  publicId: z.string().regex(/^hub\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,120}$/),
  resourceType: z.enum(['image', 'video']),
  version: z.number().int().positive(),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  format: z.string().regex(/^[a-z0-9]{2,5}$/).optional(),
  duration: z.number().min(0).max(36000).optional(),
});

export const videoSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('upload'), media: mediaSchema.extend({ resourceType: z.literal('video') }) }),
  z.object({ kind: z.literal('youtube'), id: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }),
  z.object({ kind: z.literal('vimeo'), id: z.string().regex(/^\d{6,12}$/) }),
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isValidSlug, 'Use 3–40 lowercase letters, numbers or single hyphens. Some names are reserved.');

export const profileContentSchema = z.object({
  name: text(120).min(1, 'Name is required'),
  title: text(160),
  shortBio: text(400),
  fullBio: text(6000),
  location: text(120),
  email: z.union([z.literal(''), z.string().trim().max(254).email('Enter a valid email')]),
  phone: text(40).regex(/^[0-9+()\-.\s]*$/, 'Phone may only contain digits and + ( ) - .'),
  availability: text(120),
  avatar: mediaSchema.extend({ resourceType: z.literal('image') }).nullable(),
  socialLinks: z
    .array(
      z.object({
        id,
        platform: z.enum(SOCIAL_PLATFORMS),
        url: safeUrl,
        label: text(40).optional(),
      }),
    )
    .max(16),
  skills: z.array(text(60).min(1)).max(40),
  services: z
    .array(z.object({ id, title: text(120).min(1, 'Service title is required'), description: text(600) }))
    .max(20),
  experiences: z
    .array(
      z.object({
        id,
        role: text(120).min(1, 'Role is required'),
        company: text(120),
        period: text(60),
        description: text(1000),
      }),
    )
    .max(30),
  clients: z.array(z.object({ id, name: text(120).min(1, 'Client name is required'), url: optionalUrl.optional() })).max(60),
  sections: z
    .array(z.object({ key: z.enum(SECTION_KEYS), visible: z.boolean(), heading: text(60).optional(), intro: text(200).optional() }))
    .length(SECTION_KEYS.length)
    .refine((list) => new Set(list.map((s) => s.key)).size === SECTION_KEYS.length, 'Duplicate section'),
  theme: z.object({
    mode: z.enum(['dark', 'light']),
    accent: z.enum(ACCENTS),
    headingFont: z.enum(['serif', 'sans']),
    heroStyle: z.enum(['portrait', 'type']),
    workLayout: z.enum(['editorial', 'grid', 'list']),
  }),
  seo: z.object({
    title: text(70).optional(),
    description: text(170).optional(),
    noindex: z.boolean().optional(),
  }),
});
export type ProfileContentInput = z.infer<typeof profileContentSchema>;

export const createProfileSchema = z.object({
  name: text(120).min(1, 'Name is required'),
  title: text(160),
  slug: slugSchema,
});

export const projectSchema = z.object({
  title: text(160).min(1, 'Title is required'),
  category: text(80),
  description: text(8000),
  cover: mediaSchema.extend({ resourceType: z.literal('image') }).nullable(),
  gallery: z.array(mediaSchema).max(24),
  video: videoSchema.nullable(),
  tools: z.array(text(40).min(1)).max(20),
  clientName: text(120),
  projectDate: text(40),
  link: optionalUrl,
  isHidden: z.boolean(),
  featured: z.boolean(),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const uuidSchema = z.string().uuid();

export const statusSchema = z.enum(['draft', 'published', 'archived']);

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Use at most 128 characters');
