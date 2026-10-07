# Hub — Product Requirements Document

| | |
| --- | --- |
| Product | Hub: multi-tenant portfolio platform |
| Package version | 2.0.0 (`package.json`) |
| Document status | Living document. It describes the system as built. |
| Last updated | 2026-10-07 |
| Companion files | [`GUIDELINES.md`](./GUIDELINES.md) (rules for changing the code), [`README.md`](./README.md) (quick start) |

> **Maintenance rule.** Every change that adds, removes or alters a feature, route,
> file, data field, environment variable, design token or dependency must update this
> document in the same commit. Add a line to the [Changelog](#23-changelog) at the end.
> If the code and this document disagree, the code is correct and this document must
> be fixed.

---

## Table of contents

1. [Product summary](#1-product-summary)
2. [Users and roles](#2-users-and-roles)
3. [Goals and non-goals](#3-goals-and-non-goals)
4. [Glossary](#4-glossary)
5. [Technology stack](#5-technology-stack)
6. [System architecture](#6-system-architecture)
7. [Host routing and the request lifecycle](#7-host-routing-and-the-request-lifecycle)
8. [Repository layout (every file)](#8-repository-layout-every-file)
9. [Module dependency map](#9-module-dependency-map)
10. [Data model](#10-data-model)
11. [Server Actions (internal API)](#11-server-actions-internal-api)
12. [HTTP routes](#12-http-routes)
13. [Caching and revalidation](#13-caching-and-revalidation)
14. [Media pipeline (Cloudinary)](#14-media-pipeline-cloudinary)
15. [Authentication, authorization and security](#15-authentication-authorization-and-security)
16. [Functional requirements: public portfolio](#16-functional-requirements-public-portfolio)
17. [Functional requirements: admin console](#17-functional-requirements-admin-console)
18. [UI and design system](#18-ui-and-design-system)
19. [Validation rules and limits](#19-validation-rules-and-limits)
20. [Configuration, scripts and deployment](#20-configuration-scripts-and-deployment)
21. [Change recipes](#21-change-recipes)
22. [Known limitations and technical debt](#22-known-limitations-and-technical-debt)
23. [Changelog](#23-changelog)

---

## 1. Product summary

Hub hosts portfolio websites for creative professionals such as film directors,
photographers, designers and illustrators. Each portfolio is a standalone,
fast, editorial-style site served on its own subdomain (for example
`ahmed.example.com`).

The people who own the portfolios do not log in. Portfolios are created and
edited by **administrators** in a private **console** that is only reachable at
a dedicated admin subdomain (for example `admin.example.com`). The root domain
(`example.com`) shows a short marketing landing page. The product presents
itself as invitation-only ("By invitation").

Core capabilities:

- Create, edit, preview, publish, unpublish, archive and delete portfolios.
- Per-portfolio content: identity, portrait, biography, skills, services,
  experience, clients, contact details, social links, and projects with
  cover image, gallery (images and video), and an uploaded or embedded
  (YouTube/Vimeo) film.
- Per-portfolio design: colour mode, accent colour, headline typeface, hero
  style, work layout, and section order, visibility and labels.
- SEO controls: custom title and description, `noindex`, automatic Open Graph,
  Twitter cards, JSON-LD, per-site `robots.txt` and `sitemap.xml`.
- Statically cached public pages that are invalidated on every save.
- Privacy-conscious view counting.

## 2. Users and roles

| Role | How they access Hub | What they can do |
| --- | --- | --- |
| **Administrator** | Signs in at `admin.<root>/login` with email and password. An account is an administrator only if its `auth.users.id` is in the `public.admins` table. | Everything in the console: manage all portfolios, upload media, change their own password. All administrators have equal rights. There is no per-portfolio ownership. |
| **Visitor** | Opens `<slug>.<root>` anonymously. | Views **published** portfolios and their project pages. Draft and archived portfolios return a "not available" 404 page. |
| **Operator / developer** | Shell access with service-role credentials. | Creates or promotes administrators with `npm run create-admin`, and applies database migrations. |

Administrators can only be created with the CLI script. Public sign-up must be
disabled in Supabase. Even if sign-up is left on, a non-admin account cannot
use the console.

## 3. Goals and non-goals

**Goals**

1. Portfolio pages that look premium, load fast and put the work first.
2. One address per person, kept separate from every other tenant and from the console.
3. Database load that does not grow with traffic (static generation plus on-demand invalidation).
4. Media that never passes through the app server (direct signed uploads, CDN delivery).
5. Secure by default: no client-side data access, strict headers, validated input.

**Non-goals (not built)**

- Self-service sign-up, or portfolio owners editing their own site.
- Custom domains per portfolio (only subdomains of the root domain).
- Roles or permissions among administrators.
- Contact forms, comments, e-commerce or blogs.
- Internationalisation. All UI copy is English and `lang="en"` is fixed.
- Analytics beyond a single view counter.
- Automated tests, linting and CI (see [Known limitations](#22-known-limitations-and-technical-debt)).

## 4. Glossary

| Term | Meaning |
| --- | --- |
| **Profile** | A database row in `public.profiles`. One profile is one portfolio site. The UI calls it a "portfolio". |
| **Slug** | The subdomain label of a profile (`ahmed` in `ahmed.example.com`). Stored as `citext`, so it is unique without regard to case. The UI calls it the "subdomain" or "address". |
| **Project** | A work item in `public.projects` that belongs to one profile. The UI calls these "Work". |
| **Section** | One of six fixed homepage blocks: `about`, `expertise`, `work`, `experience`, `clients`, `contact`. |
| **Media** | A JSON reference to a Cloudinary asset (`publicId`, `version`, dimensions…). URLs are always built from it and are never stored. |
| **Root domain** | `NEXT_PUBLIC_ROOT_DOMAIN`, e.g. `example.com` or `localhost:3000`. |
| **Console** | The admin application served on the admin subdomain. Internally it lives under `src/app/console`. |
| **Site tag** | The cache tag `site:<slug>` that groups all cached data for a portfolio. |

## 5. Technology stack

| Layer | Technology | Version (package.json) | Notes |
| --- | --- | --- | --- |
| Framework | Next.js App Router | `^16.4.0` | Uses `src/proxy.ts` (the Next 16 name for middleware), Server Actions, ISR, `after()`, `revalidateTag(tag, { expire: 0 })`. |
| UI runtime | React / React DOM | `^19.3.0` | `useActionState`, `useTransition`, native `<dialog>`. |
| Language | TypeScript | `^7.0.2` | `strict: true`. Path alias `@/*` maps to `src/*`. No JS files are allowed (`allowJs: false`), except the `.mjs` CLI script. |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss` | `^4.3.3` | Design tokens are in `@theme` in `src/app/globals.css`. There is no `tailwind.config`. |
| Icons | `lucide-react` | `^1.52.0` | The only icon set. |
| Validation | Zod | `^4.6.5` | All server input. |
| Database / Auth | Supabase (Postgres + Supabase Auth) | `@supabase/supabase-js ^2.117.2`, `@supabase/ssr ^0.12.7` | Data access only uses the service role on the server. |
| Media | Cloudinary (REST API, no SDK) | — | Signed direct uploads, delivery transformations. |
| Fonts | `next/font/google`: Geist, Geist Mono, Instrument Serif | — | Self-hosted at build time. |
| Guards | `server-only` | `^0.0.1` | Imported by every server-only module. |
| Hosting | Vercel (`vercel.json`: `framework: nextjs`) | — | Any Node host works if the `Host` header is preserved. |
| Runtime | Node.js | `>=20.9` | |

## 6. System architecture

```
                         ┌──────────────────────────────────────────────┐
 Browser ──HTTPS──▶ CDN / │ Next.js (Vercel)                             │
                         │                                              │
                         │  src/proxy.ts  ── classifies Host header ──┐ │
                         │      │ root        → /           (landing)  │ │
                         │      │ <slug>      → /site/<slug>/*  (ISR)  │ │
                         │      │ admin       → /console/*  (dynamic)  │ │
                         │      │ invalid     → 404                    │ │
                         │                                              │
                         │  Server Components / Server Actions          │
                         │      │ service-role client (lib/supabase/admin)
                         │      │ auth client (cookies, publishable key)
                         └──────┼───────────────────────────────────────┘
                                │ HTTPS (PostgREST, Auth)
                                ▼
                         Supabase: Postgres (RLS on, no policies) + Auth

 Console browser ──signed multipart POST──▶ api.cloudinary.com (upload)
 Any browser ──GET──▶ res.cloudinary.com (f_auto,q_auto delivery)
 Server ──DELETE (Basic auth)──▶ api.cloudinary.com (cleanup, in after())
```

Key architectural decisions:

1. **Host-based multi-tenancy.** One Next.js app serves three kinds of host. The
   internal route trees `/site/*` and `/console/*` cannot be reached by path.
   The proxy returns 404 for direct requests to them, so they are reached only
   through host rewrites.
2. **The server is the only data client.** Postgres has RLS enabled and no
   policies, and `anon` and `authenticated` have no grants. The publishable key
   is used only for sign-in and session refresh. All reads and writes use the
   service-role key inside server code that has passed an admin check (console)
   or that filters strictly to published data (public site).
3. **Static public pages.** Portfolio and project pages are ISR pages. The
   initial list of static params is empty, so each page renders on its first
   request. Each page is cached under the `site:<slug>` tag, which every
   mutation invalidates. A one-day `revalidate` is a safety net.
4. **Media bypasses the app.** The server only signs upload parameters. The
   browser uploads directly to Cloudinary, and the server stores only the
   returned reference.

## 7. Host routing and the request lifecycle

Implemented in `src/proxy.ts` with `classifyHost()` from `src/lib/hosts.ts`.

| Incoming host | Classified as | Behaviour |
| --- | --- | --- |
| `<root>` or `www.<root>` | `root` | `NextResponse.next()` serves `src/app/page.tsx`. `/api/*` returns 404. |
| Unknown host (e.g. `*.vercel.app` preview URL) | `root` | Same as root. |
| `<ADMIN_SUBDOMAIN>.<root>` | `admin` | Rewrite to `/console<path>`. The Supabase session is refreshed. A visitor without a session is redirected to `/login?next=<path>`, except for `/login` and `/robots.txt`. Adds `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: private, no-store`. `/api/*` returns 404. |
| `<slug>.<root>` with a valid slug | `site` | Rewrite to `/site/<slug><path>`. Only `/api/view` is allowed under `/api`. Everything else under `/api` returns 404. |
| Nested subdomain, invalid or reserved label | `invalid` | 404. |
| Any host, path starting `/console` or `/site` | — | 404. Internal trees are never reachable directly. |

The 404 response is a rewrite to `/__not-found` with status 404, which renders
`src/app/not-found.tsx`.

The proxy matcher skips `_next/static`, `_next/image`, `favicon.ico`, `icon.svg`,
`apple-icon.png` and common static asset extensions.

Local development works because `*.localhost` resolves to 127.0.0.1 in Chrome,
Edge and Firefox. `next.config.ts` sets `allowedDevOrigins: ['*.localhost']`.

**Request example (published portfolio):**
`GET https://ahmed.example.com/work/<uuid>` → proxy rewrites to
`/site/ahmed/work/<uuid>` → `src/app/site/[slug]/work/[projectId]/page.tsx` →
`getPublishedSite('ahmed')` (cached by `unstable_cache` with tag `site:ahmed`)
→ `ProjectDetail` renders. The HTML is cached until the tag is invalidated.

**Request example (console save):**
The admin clicks **Save** → the `saveProfile()` Server Action runs →
`requireAdmin()` → Zod validation → `UPDATE profiles` →
`revalidateTag('site:<slug>')` → `after()` deletes orphaned Cloudinary assets →
the client calls `router.refresh()`.

## 8. Repository layout (every file)

```
.
├── PRD.md                         This document
├── GUIDELINES.md                  Rules for modifying the codebase
├── CLAUDE.md                      Entry point for AI agents: points to PRD + GUIDELINES
├── README.md                      Quick start, environment, deployment, overview
├── package.json / package-lock.json
├── tsconfig.json                  strict TS, alias @/* → src/*, excludes .legacy-backup
├── next.config.ts                 CSP + security headers, images.unoptimized, 1 MB action body limit
├── postcss.config.mjs             Tailwind 4 PostCSS plugin
├── vercel.json                    framework: nextjs
├── .env.example                   Template for .env.local (never commit real values)
├── .gitignore                     node_modules, .next, env files, .vercel, .legacy-backup
├── .claude/launch.json            Dev-server launch config (npm run dev, port 3000)
├── scripts/
│   └── create-admin.mjs           Interactive CLI: create or promote an admin (hidden password input)
├── supabase/migrations/
│   ├── 20261007000000_init.sql                    Schema, functions, triggers, lockdown
│   └── 20261007000100_harden_and_availability.sql Revoke rls_auto_enable, add profiles.availability
└── src/
    ├── proxy.ts                   Host routing + console session gate (see §7)
    ├── app/
    │   ├── layout.tsx             Root <html>: fonts (CSS vars), global metadata, viewport/theme colour
    │   ├── globals.css            Tailwind import, @theme tokens, .portfolio theme system, utilities
    │   ├── page.tsx               Root-domain landing page (static, dark/ember portfolio styling)
    │   ├── not-found.tsx          Global 404 ("Nothing here.")
    │   ├── robots.ts              Root robots: allow all
    │   ├── icon.svg               Favicon (Hub "H" mark)
    │   ├── api/view/route.ts      POST view counter (site hosts only)
    │   ├── site/[slug]/
    │   │   ├── page.tsx           Public portfolio home (ISR) + JSON-LD Person + ViewBeacon
    │   │   ├── metadata.ts        buildSiteMetadata(): title, description, canonical, OG, Twitter, robots
    │   │   ├── not-found.tsx      Portfolio 404 ("This page isn't available.") with link to root
    │   │   ├── robots.txt/route.ts   Per-site robots (Disallow all if missing or noindex)
    │   │   ├── sitemap.xml/route.ts  Per-site sitemap (home + visible projects)
    │   │   └── work/[projectId]/page.tsx  Public project page (ISR)
    │   └── console/
    │       ├── layout.tsx         Console root: ToastProvider, noindex metadata, title template
    │       ├── robots.txt/route.ts   Disallow all
    │       ├── login/
    │       │   ├── page.tsx       Split-screen sign-in page; verified admins redirect to /
    │       │   └── LoginForm.tsx  Client form using useActionState(login)
    │       ├── (shell)/           Route group: everything behind the sidebar (admin required)
    │       │   ├── layout.tsx     requireAdminPage(); grid with Sidebar
    │       │   ├── Sidebar.tsx    Logo, nav (Portfolios, Account), public-site link, email, sign out
    │       │   ├── page.tsx       Dashboard: listProfiles() + getMetrics()
    │       │   ├── SitesDashboard.tsx  Metrics, filter tabs, search, portfolio list, copy/open actions
    │       │   ├── NewSiteDialog.tsx   Create portfolio (name, title, slug with live availability)
    │       │   ├── account/
    │       │   │   ├── page.tsx         Email card + password card
    │       │   │   └── PasswordForm.tsx useActionState(changePassword)
    │       │   └── sites/[id]/
    │       │       ├── page.tsx         Loads profile + projects, renders SiteEditor
    │       │       ├── SiteEditor.tsx   Editor shell: top bar, tabs, draft state, save, publish
    │       │       ├── panels.tsx       Identity, About, Expertise, Experience, Clients, Contact,
    │       │       │                    Layout (sections), Appearance, SEO panels
    │       │       ├── ProjectsPanel.tsx  Project list: reorder, hide, edit, delete (saves instantly)
    │       │       ├── ProjectDialog.tsx  Create/edit project: fields, cover, film, gallery, tools, flags
    │       │       └── SettingsPanel.tsx  Status cards, subdomain change, delete portfolio
    │       ├── preview/[id]/
    │       │   ├── page.tsx       Admin preview of any status (shows saved content, not unsaved draft)
    │       │   ├── PreviewBar.tsx Dark top bar: back to editor, host, status
    │       │   └── work/[projectId]/page.tsx  Preview of a project (hidden project viewable directly)
    │       └── _actions/          Server Actions (private folder, not a route)
    │           ├── result.ts      ActionResult type, ok/fail/fromZod/guard helpers
    │           ├── auth.ts        login, logout, changePassword
    │           ├── profiles.ts    checkSlug, createProfile, saveProfile, updateSlug, setStatus,
    │           │                  deleteProfile, getUploadSignature
    │           └── projects.ts    createProject, updateProject, setProjectHidden, deleteProject,
    │                              reorderProjects
    ├── components/
    │   ├── ui/
    │   │   ├── primitives.tsx     cn, Button, Input, Textarea, Select, Field, Switch, Card,
    │   │   │                      CardHeader, StatusBadge, Dialog, EmptyState (console only)
    │   │   ├── toast.tsx          ToastProvider + useToast (success/error, bottom-right)
    │   │   └── CldImage.tsx       Responsive Cloudinary <img> with srcset (server-compatible)
    │   ├── console/
    │   │   ├── ListEditor.tsx     ListEditor (ordered rows), TagInput, move(), newId()
    │   │   ├── MediaField.tsx     Single image/video drop zone with progress, replace, remove
    │   │   └── upload.ts          uploadToCloudinary(), kindOf(), ACCEPT_ATTR (client)
    │   └── portfolio/
    │       ├── Portfolio.tsx      Public homepage renderer (server component)
    │       ├── ProjectDetail.tsx  Public project page renderer (server component)
    │       ├── client.tsx         RevealObserver, ViewBeacon, CopyButton (client)
    │       └── social.ts          SOCIAL_NAMES, socialLabel()
    └── lib/
        ├── env.ts                 serverEnv: lazy getters for required server env vars
        ├── hosts.ts               ROOT_DOMAIN, PROTOCOL, slug rules, RESERVED_SLUGS, URL builders,
        │                          slugify(), classifyHost() (browser-safe)
        ├── types.ts               Domain types and constants (sections, accents, platforms, defaults)
        ├── schemas.ts             Zod schemas for all writes (+ safeUrl, mediaSchema, passwordSchema)
        ├── mappers.ts             Column lists, row → domain mappers, normalizeSections/Theme
        ├── media.ts               Cloudinary delivery URLs, srcset, video URLs, YouTube/Vimeo parsing
        ├── cloudinary.ts          Server: upload signing, asset/folder deletion, media diffing
        ├── auth.ts                getAdmin (per-request cache), requireAdminPage, requireAdmin
        ├── rate-limit.ts          In-memory fixed-window limiter, clientIp()
        ├── supabase/
        │   ├── admin.ts           db(): singleton service-role client
        │   ├── server.ts          authClient(): cookie-bound publishable-key client
        │   └── proxy.ts           refreshSession(): used by src/proxy.ts
        └── data/
            ├── public.ts          getPublishedSite() (cached, tagged), siteTag()
            └── console.ts         listProfiles(), getMetrics(), getProfileWithProjects()
```

`.legacy-backup/` (git-ignored, may exist locally) holds a previous Express/Vite
version. It is not part of the build and must not be imported.

## 9. Module dependency map

```
types.ts ◀── schemas.ts ◀── _actions/*, SiteEditor, ProjectDialog
   ▲   ▲            ▲
   │   └── mappers.ts ◀── data/public.ts, data/console.ts, _actions/projects.ts
   │
hosts.ts ◀── proxy.ts, api/view, schemas.ts, data/public.ts, metadata.ts, robots/sitemap,
             landing page, Sidebar, SitesDashboard, NewSiteDialog, SettingsPanel, SiteEditor,
             panels, PreviewBar, site not-found
env.ts ◀── supabase/admin.ts, supabase/server.ts, cloudinary.ts
supabase/admin.ts (db) ◀── auth.ts, data/*, _actions/*, api/view
supabase/server.ts (authClient) ◀── auth.ts, _actions/auth.ts
supabase/proxy.ts ◀── proxy.ts
auth.ts ◀── (shell)/layout + pages, preview pages, login page, _actions/*, _actions/result.ts
cloudinary.ts ◀── _actions/profiles.ts, _actions/projects.ts
media.ts ◀── CldImage, MediaField, ProjectDialog, ProjectsPanel, SitesDashboard,
             ProjectDetail, metadata.ts
data/public.ts ◀── site pages, robots, sitemap, _actions (siteTag)
data/console.ts ◀── dashboard page, editor page, preview pages
components/portfolio/* ◀── site pages AND console preview pages (shared renderer)
components/ui/primitives + toast ◀── all console client components
components/console/* ◀── panels.tsx, ProjectDialog, ProjectsPanel
components/console/upload.ts ──▶ _actions/profiles.getUploadSignature (Server Action call)
```

Boundary rules (enforced by convention and by `server-only`):

- Modules that import `server-only` (`env`, `auth`, `cloudinary`, `rate-limit`,
  `supabase/admin`, `supabase/server`, `data/*`, `_actions/result`) must never
  be imported by client components. Client components call Server Actions instead.
- `hosts.ts`, `media.ts`, `types.ts`, `schemas.ts` and `mappers.ts` are isomorphic.
  They only read `NEXT_PUBLIC_*` variables.
- `Portfolio` and `ProjectDetail` are shared by the live site and the console
  preview. They take an `hrefBase` prop (`''` live, `/preview/<id>` in preview).

## 10. Data model

Source of truth: `supabase/migrations/*.sql`. TypeScript mirror: `src/lib/types.ts`.
Mapping: `src/lib/mappers.ts` (snake_case rows → camelCase domain objects).

### 10.1 Enum

`public.profile_status`: `'draft' | 'published' | 'archived'` (default `draft`).

### 10.2 `public.admins`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid PK | FK → `auth.users(id)` `ON DELETE CASCADE` |
| `created_at` | timestamptz | default `now()` |

### 10.3 `public.profiles`

| Column | Type | Default | Constraint / notes | Domain field |
| --- | --- | --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` | | `id` |
| `slug` | `extensions.citext` | — | unique, required; regex `^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$`; not in reserved list | `slug` |
| `name` | text | — | 1–120 chars | `name` |
| `title` | text | `''` | ≤160 | `title` |
| `short_bio` | text | `''` | ≤400 | `shortBio` |
| `full_bio` | text | `''` | ≤6000 | `fullBio` |
| `location` | text | `''` | ≤120 | `location` |
| `email` | text | `''` | ≤254 | `email` |
| `phone` | text | `''` | ≤40 | `phone` |
| `availability` | text | `''` | ≤120 (added in migration 2) | `availability` |
| `avatar` | jsonb | null | `Media` (image) | `avatar` |
| `social_links` | jsonb | `[]` | must be array | `socialLinks: SocialLink[]` |
| `skills` | text[] | `{}` | | `skills` |
| `services` | jsonb | `[]` | must be array | `services: ServiceItem[]` |
| `experiences` | jsonb | `[]` | must be array | `experiences: ExperienceItem[]` |
| `clients` | jsonb | `[]` | must be array | `clients: ClientItem[]` |
| `sections` | jsonb | `[]` | must be array | `sections: SectionConfig[]` (normalized) |
| `theme` | jsonb | `{}` | | `theme: Theme` (merged over `DEFAULT_THEME`) |
| `seo` | jsonb | `{}` | | `seo: Seo` |
| `status` | profile_status | `draft` | | `status` |
| `views` | bigint | 0 | incremented by RPC only | `views` (omitted from public data) |
| `published_at` | timestamptz | null | set on each publish | `publishedAt` |
| `created_at` / `updated_at` | timestamptz | `now()` | `updated_at` maintained by trigger | `createdAt` / `updatedAt` |

Indexes: `profiles_status_idx (status)`, `profiles_updated_at_idx (updated_at desc)`.

Reserved slugs (duplicated in the DB constraint **and** `RESERVED_SLUGS` in
`src/lib/hosts.ts`; keep them identical): `admin www api app mail email smtp ftp
cdn static assets dashboard console auth login status help support docs blog dev
staging test preview root hub system billing account`. The app also rejects
`--` (double hyphen) in a slug. The DB does not check for it.

### 10.4 `public.projects`

| Column | Type | Default | Constraint | Domain field |
| --- | --- | --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` | | `id` |
| `profile_id` | uuid | — | FK → profiles `ON DELETE CASCADE` | `profileId` |
| `title` | text | — | 1–160 | `title` |
| `category` | text | `''` | ≤80 (UI label "Discipline") | `category` |
| `description` | text | `''` | ≤8000 | `description` |
| `cover` | jsonb | null | `Media` (image) | `cover` |
| `gallery` | jsonb | `[]` | array of `Media` (image or video) | `gallery` |
| `video` | jsonb | null | `VideoSource` | `video` |
| `tools` | text[] | `{}` | | `tools` |
| `client_name` | text | `''` | ≤120 | `clientName` |
| `project_date` | text | `''` | ≤40 (free text, UI label "Year") | `projectDate` |
| `link` | text | `''` | ≤500, http(s) only (app) | `link` |
| `position` | integer | 0 | ordering, ascending | `position` |
| `is_hidden` | boolean | false | hidden projects are excluded from public data | `isHidden` |
| `featured` | boolean | false | full-width in the editorial layout | `featured` |
| `created_at` / `updated_at` | timestamptz | `now()` | trigger-maintained | (not mapped) |

Index: `projects_profile_position_idx (profile_id, position)`.

### 10.5 JSONB shapes (TypeScript)

```ts
Media        = { publicId: string /* hub/<profileUuid>/<id> */, resourceType: 'image'|'video',
                 version: number, width: number, height: number, format?: string, duration?: number }
VideoSource  = { kind: 'upload', media: Media } | { kind: 'youtube', id: string /* 11 chars */ }
             | { kind: 'vimeo', id: string /* 6–12 digits */ }
SocialLink   = { id, platform: SocialPlatform, url, label? }
SocialPlatform = website|instagram|linkedin|behance|dribbble|x|youtube|vimeo|github|facebook|tiktok|other
ServiceItem  = { id, title, description }
ExperienceItem = { id, role, company, period, description }
ClientItem   = { id, name, url? }
SectionConfig = { key: SectionKey, visible: boolean, heading?: string, intro?: string }
SectionKey   = about|expertise|work|experience|clients|contact          (SECTION_KEYS order = default order)
Theme        = { mode: 'dark'|'light', accent: Accent, headingFont: 'serif'|'sans',
                 heroStyle: 'portrait'|'type', workLayout: 'editorial'|'grid'|'list' }
Accent       = ember|saffron|teal|cobalt|moss|mono
Seo          = { title?, description?, noindex? }
```

List item `id`s are 16-character hex strings created on the client by `newId()`.
The schema requires `^[a-zA-Z0-9_-]{1,40}$`.

Defaults: `DEFAULT_THEME = { mode: 'dark', accent: 'ember', headingFont: 'serif',
heroStyle: 'portrait', workLayout: 'editorial' }`. `DEFAULT_SECTIONS` = all six
keys, visible, in `SECTION_KEYS` order.

`normalizeSections()` makes sure every known section appears exactly once.
Unknown keys are dropped, and missing keys are appended in default order. Adding
a section key in code therefore needs no data migration.

### 10.6 Database functions

All functions use `set search_path = ''`. Execute is revoked from
`public, anon, authenticated` and granted to `service_role`.

| Function | Kind | Purpose | Called from |
| --- | --- | --- | --- |
| `set_updated_at()` | trigger | `new.updated_at := now()` before update on profiles and projects | triggers |
| `increment_profile_views(p_slug text)` | `security definer`, sql | Atomic `views + 1`, only when status = published | `api/view/route.ts` |
| `reorder_projects(p_profile_id uuid, p_ids uuid[])` | `security definer`, sql | Sets `position` from array ordinality, scoped to the profile | `reorderProjects` action |
| `dashboard_metrics()` | `security definer`, stable | Returns `total, published, draft, archived, views` in one row | `getMetrics()` |

Migration 2 also revokes execute on the platform helper `public.rls_auto_enable()`.

### 10.7 Security posture of the schema

RLS is enabled on all three tables with **no policies**, and `anon` and
`authenticated` have all privileges revoked. Never add an RLS policy or grant
that exposes these tables to the publishable key.

## 11. Server Actions (internal API)

All actions live in `src/app/console/_actions/` and are marked `'use server'`.
Each one:

1. Is wrapped in `guard()`. Thrown errors become generic results, and details go
   to the server log. `UnauthorizedError` becomes "Your session has expired.
   Sign in again." Next.js control-flow errors (with a `digest`) are re-thrown.
2. Calls `requireAdmin()` first. The exception is `login`, which runs before any
   session exists.
3. Validates every argument (`uuidSchema`, Zod schemas).
4. Returns `ActionResult<T>` = `{ ok: true, data }` or
   `{ ok: false, error, fieldErrors? }`. `fieldErrors` keys are dotted Zod paths
   (e.g. `services.2.title`). The editor maps them to tabs and fields.

| Action | Args | Validation | Effect | Cache / cleanup |
| --- | --- | --- | --- | --- |
| `login(prev, form)` | FormData `email`, `password`, `next?` | `loginSchema`; rate limit 20/15 min per IP and 8/15 min per email | `signInWithPassword`; non-admin is signed out | Redirects to `safeNext(next)` (relative paths only). Same generic error for every failure. |
| `logout()` | — | — | `signOut()` | Redirects to `/login` |
| `changePassword(prev, form)` | FormData `current`, `next`, `confirm` | `changePasswordSchema` (≥12, ≤128, match, differs); 5/15 min per admin | Verifies current password by re-signing in, `updateUser`, `signOut({ scope: 'others' })` | — |
| `checkSlug(raw, excludeId?)` | string, uuid? | `isValidSlug` | Read-only availability check | — |
| `createProfile({ name, title, slug })` | object | `createProfileSchema` | Inserts with `DEFAULT_SECTIONS`, `DEFAULT_THEME`, `seo: {}`; status draft | Postgres `23505` → "already in use", `23514` → "not allowed" |
| `saveProfile(id, input)` | uuid, `ProfileContentInput` | `profileContentSchema`; avatar must be in `hub/<id>/` | Updates all content columns | `revalidateTag(site:<slug>)`; `after()` destroys a replaced or removed avatar |
| `updateSlug(id, raw)` | uuid, string | `slugSchema` | Updates slug (no-op if unchanged) | Invalidates the old and new tags. The old address stops working, and there are no redirects. |
| `setStatus(id, status)` | uuid, status | `statusSchema` | Updates status; sets `published_at` when publishing | Invalidates tag |
| `deleteProfile(id, confirmSlug)` | uuid, string | `confirmSlug` must equal the slug | Deletes the row (projects cascade) | Invalidates tag; `after()` deletes the whole Cloudinary folder |
| `getUploadSignature(profileId, kind)` | uuid, `'image'\|'video'` | profile must exist | Returns `{ url, fields, maxBytes }` | — |
| `createProject(profileId, input)` | uuid, `ProjectInput` | `projectSchema`; all media under `hub/<profileId>/` | Inserts at `max(position) + 1` | Invalidates tag |
| `updateProject(projectId, input)` | uuid, `ProjectInput` | same | Updates the row | Invalidates tag; `after()` destroys orphaned media |
| `setProjectHidden(projectId, hidden)` | uuid, boolean | uuid | Toggles `is_hidden` | Invalidates tag |
| `deleteProject(projectId)` | uuid | uuid | Deletes the row | Invalidates tag; `after()` destroys all of its media |
| `reorderProjects(profileId, ids)` | uuid, uuid[] (≤500) | Zod | RPC `reorder_projects` | Invalidates tag |

## 12. HTTP routes

Paths below are **external** paths on the given host. The internal file path is in parentheses.

**Root host**

| Path | Method | Description |
| --- | --- | --- |
| `/` | GET | Landing page (`app/page.tsx`) |
| `/robots.txt` | GET | `Allow: /` (`app/robots.ts`) |
| `/icon.svg` | GET | Favicon |

**Portfolio host `<slug>.<root>`**

| Path | Method | Description |
| --- | --- | --- |
| `/` | GET | Portfolio home (`site/[slug]/page.tsx`), ISR, 404 unless published |
| `/work/<projectId>` | GET | Project page (`site/[slug]/work/[projectId]/page.tsx`). Hidden projects return 404. |
| `/robots.txt` | GET | `Allow` + `Sitemap:` line, or `Disallow: /` when unpublished or noindex |
| `/sitemap.xml` | GET | URLs for home and each visible project, `lastmod = profile.updatedAt`. 404 when unpublished or noindex. |
| `/api/view` | POST | View beacon. Always returns 204 to valid site hosts. Increments only when the request is same-origin (`Sec-Fetch-Site` or `Origin`), the user agent is not a bot, and there is no `hub_v` cookie. Sets `hub_v` (HttpOnly, SameSite=Strict, 12 h). |

**Admin host `<ADMIN_SUBDOMAIN>.<root>`**

| Path | Description | Auth |
| --- | --- | --- |
| `/login` | Sign-in (`console/login`) | Public; verified admins are redirected to `/` |
| `/` | Dashboard (`console/(shell)/page.tsx`) | Admin |
| `/sites/<id>` | Portfolio editor | Admin |
| `/account` | Account / password | Admin |
| `/preview/<id>` | Preview of the saved portfolio, any status (opens in a new tab) | Admin |
| `/preview/<id>/work/<projectId>` | Preview of a project (hidden projects can be opened directly) | Admin |
| `/robots.txt` | `Disallow: /` | Public |

Console pages that are not admin-only get the console `robots` metadata
(`noindex, nofollow, nocache`) through `console/layout.tsx`.

## 13. Caching and revalidation

| What | Mechanism | Lifetime | Invalidation |
| --- | --- | --- | --- |
| Published site data | `unstable_cache(loadPublishedSite, ['published-site', slug], { tags: ['site:<slug>'], revalidate: 86400 })` in `lib/data/public.ts` | 1 day max | `revalidateTag('site:<slug>', { expire: 0 })` in every profile and project mutation |
| Portfolio and project HTML | `export const revalidate = 86400`, `dynamicParams = true`, `generateStaticParams() → []` | Rendered on first request, then cached | Same tag (the pages read the tagged data) |
| `robots.txt` / `sitemap.xml` per site | `revalidate = 86400` | 1 day | Same tag |
| Console pages and data | Dynamic (cookies), `Cache-Control: private, no-store` from the proxy | Never cached | — |
| Console client state | `router.refresh()` after mutations | — | — |

One public page build makes **one** PostgREST request: the profile with its
embedded projects, filtered `is_hidden = false` and ordered by `position`.

Rule: any new code that writes a profile or project **must** call
`revalidateTag(siteTag(slug), { expire: 0 })` for every slug affected.

## 14. Media pipeline (Cloudinary)

**Storage layout:** every asset for a profile lives in the folder `hub/<profileId>/`.
Public IDs must match `^hub\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,120}$`, and actions
also check that the prefix matches the profile being edited.

**Upload flow**

1. The client (`MediaField` or the `ProjectDialog` gallery) calls `uploadToCloudinary(profileId, file, kind)`.
2. The client checks the MIME type with `kindOf()` against the accept lists.
3. The `getUploadSignature` Server Action calls `signUpload()`. Signed params:
   `allowed_formats`, `folder`, `timestamp`, `unique_filename=true`,
   `use_filename=false`, `overwrite=false`, and for images
   `transformation=c_limit,w_2800,h_2800`. The signature is SHA-1 over sorted
   params plus the API secret.
4. The client enforces `maxBytes`. The browser then POSTs multipart data with an
   `XMLHttpRequest` (for progress) to `https://api.cloudinary.com/v1_1/<cloud>/<kind>/upload`.
5. The response is turned into a `Media` object and held in form state. It is
   saved only when the admin saves.

| Kind | Allowed formats (server) | Accepted MIME (client) | Max size |
| --- | --- | --- | --- |
| image | jpg, jpeg, png, webp, avif, heic | image/jpeg, png, webp, avif, heic, heif | 15 MB |
| video | mp4, mov, webm, m4v | video/mp4, quicktime, webm, x-m4v | 100 MB |

**Delivery (`src/lib/media.ts`)**

- `imageUrl(media, { width, height?, crop: 'fill'|'limit', quality })` builds
  `f_auto,q_<quality>,c_<crop>,w_<w>[,h_<h>][,g_auto]`. Width is clamped to the
  source width, so images are never upscaled.
- `imageSrcSet()` uses widths `320, 480, 640, 828, 1080, 1280, 1600, 1920, 2400`
  up to `min(max, media.width)`.
- `videoUrl()`: `f_auto:video,q_auto,c_limit,w_1920,h_1920`. `videoPoster()`
  takes the first frame as JPG.
- `parseVideoLink()` accepts `youtu.be`, `youtube.com` (`v=`, `/embed/`,
  `/shorts/`, `/live/`), `youtube-nocookie.com`, `vimeo.com` and
  `player.vimeo.com`. `embedUrl()` returns `youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1`
  or `player.vimeo.com/video/<id>?dnt=1&title=0&byline=0&portrait=0`.
- `CldImage` renders a plain `<img>` with `srcset`, `sizes`, intrinsic size,
  lazy loading by default, and `fetchPriority=high` when `priority` is set. The
  Next.js image optimizer is disabled (`images.unoptimized: true`).

**Cleanup (`src/lib/cloudinary.ts`)**, always inside `after()`. It never blocks
the response and never throws.

- `collectMedia(...values)` walks JSON to find every `Media` object.
- `removedMedia(before, after)` returns the de-duplicated set difference by `publicId`.
- `destroyMedia(items)` sends batched DELETEs (100 per call, per resource type)
  with `invalidate=true`.
- `destroyProfileFolder(id)` deletes by prefix for images and videos, then deletes the folder.

Media added in an editor session that is never saved stays in Cloudinary as
an orphan (see §22).

## 15. Authentication, authorization and security

**Session**

- Supabase Auth with email and password. Session cookies are written by
  `@supabase/ssr` with options forced to `httpOnly: true`, `sameSite: 'lax'`,
  and `secure` in production. Cookies are host-only on the admin host, so
  portfolio subdomains cannot read them.
- `src/proxy.ts` → `refreshSession()` refreshes the token on every console
  request and redirects requests without a session to `/login`. This is a
  fast gate only.

**Authorization (defence in depth)**

- `getAdmin()` (React `cache`, once per request) checks `auth.getClaims()` and
  looks up the `sub` in `public.admins`.
- `requireAdminPage()` is used by every console page and by `(shell)/layout.tsx`.
  It redirects to `/login`.
- `requireAdmin()` is the first statement of every Server Action except `login`.
  It throws `UnauthorizedError`.
- The login page only skips the form for **verified admins**.

**Passwords:** at least 12 and at most 128 characters. They are always masked and
there is deliberately no "show password" toggle. They are never logged. The CLI
reads them with echo disabled. Changing a password signs out other sessions.
Login errors are generic.

**Rate limiting:** `rate-limit.ts` keeps in-memory fixed windows per serverless
instance. It adds to Supabase's own limits and does not replace them.

**Input handling:** all writes are validated with Zod (§19). URLs must be
absolute `http:`/`https:` (`safeUrl`). Media must belong to the profile's folder.
Video embeds are rebuilt from parsed IDs, never from raw URLs. The post-login
`next` must be a relative path (no `//`, no `\`). JSON-LD escapes `<`. The
sitemap XML-escapes URLs. External links use `rel="noopener noreferrer"`, plus
`nofollow` for client and project links and `me` for social links.

**Response headers (`next.config.ts`, all routes)**

- `Content-Security-Policy`: `default-src 'self'`; scripts `'self' 'unsafe-inline'`
  (plus `'unsafe-eval'` in dev); styles `'self' 'unsafe-inline'`; images `'self'
  data: blob: https://res.cloudinary.com`; media `'self' blob: https://res.cloudinary.com`;
  fonts `'self'`; connect `'self' https://api.cloudinary.com` (plus `ws: wss:`
  in dev); frames `https://www.youtube-nocookie.com https://player.vimeo.com`;
  `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`;
  `form-action 'self'`; `upgrade-insecure-requests` in production.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and
  `X-DNS-Prefetch-Control: on`. `poweredByHeader: false`.
- Server Action request bodies are limited to 1 MB.

Any new third-party origin (script, image, frame, API) **must** be added to the
CSP deliberately and recorded here.

## 16. Functional requirements: public portfolio

Rendered by `src/components/portfolio/Portfolio.tsx` (home) and
`ProjectDetail.tsx` (project), both server components.

### 16.1 Visibility

- Only `status = 'published'` profiles are served. Anything else returns the site 404 page.
- Projects with `is_hidden = true` are excluded from every public view, link and sitemap.
- A section is shown only if `visible` is true **and** it has content:

| Section | Has content when |
| --- | --- |
| about | `fullBio` or `shortBio` |
| expertise | any skills or services |
| work | at least one visible project |
| experience | any experiences |
| clients | any clients |
| contact | email, phone or any social link |

### 16.2 Page structure (home)

1. **Sticky header:** the name (anchor `#top`), up to 4 section links (contact
   excluded) on `md` and above, and a "Get in touch" accent pill when contact is
   shown. It uses a translucent background with blur.
2. **Hero** (`theme.heroStyle`):
   - `portrait` (only when an avatar exists): 12-column grid. On the left (7
     columns): title as an eyebrow, the name in display type
     `clamp(3.25rem, 9vw, 8.5rem)`, the short bio, meta, and a scroll cue. On
     the right (5 columns): a 4:5 portrait (priority loading).
   - `type` (or portrait without an avatar): an oversized name
     `clamp(3.5rem, 13vw, 12rem)`, a rule, the short bio (7 columns) and meta (5 columns).
   - Meta: an availability pill with a pulsing accent dot (the ping is hidden
     with reduced motion), and the location.
   - The scroll cue "View selected work" appears only when the work section is shown.
3. **Sections**, in configured order, numbered `01`, `02`… in accent mono text.
   The label is `heading` or the default label, and the optional `intro` line
   appears for every section except contact.
   - **About:** the first paragraph is a large display statement. The rest is body copy.
   - **Expertise:** skill pills (4 columns) and a numbered services list
     (display titles and descriptions).
   - **Work** (`theme.workLayout`):
     - `editorial`: a 12-column grid. Featured projects span the full width at
       16:9. Others alternate 6 columns at 5:4 and an offset of 5 columns at 4:5
       (`mt-32`). The arrow becomes an accent circle on hover.
     - `grid`: two columns at 4:3 with title and meta.
     - `list`: large display titles, a 16:10 thumbnail on `md` and above, and "View ↗".
     - Projects with any video show a "Film" badge. Projects without a cover
       show the title as a placeholder.
     - Meta line: `category · client · year`.
   - **Experience:** rows of period / role + company / description.
   - **Clients:** a bordered typographic wall in 2/3/4 columns. A client with a
     URL is an external link.
   - **Contact:** a closing headline (`intro`, or the default "Let's make
     something *worth remembering.*" with an accent italic), a large `mailto`
     link with a Copy button, a `tel:` link, and a list of social links.
4. **Footer:** © year and name, plus "Back to top".

### 16.3 Project page

A sticky header with "All work" (→ `/#work`) and the name (→ `/`). A category
eyebrow, a title in display type, and a facts row (Client, Discipline, Year,
Tools, a "Visit project" link). Hero media priority: YouTube/Vimeo iframe
(16:9, sandboxed, lazy) → uploaded video (`preload="metadata"`, poster from the
cover or the first frame) → cover image → nothing. Then "Overview" (the first
paragraph is emphasised, the others muted) and the gallery: two columns, where
landscape images (w ≥ 1.25 h), a single image, or an odd last item span the full
width. Videos use `preload="none"`. Then "Next project", which wraps around to
the first. The footer has "Get in touch" (→ `/#contact`).

### 16.4 SEO and sharing (`site/[slug]/metadata.ts`)

- Title: `seo.title` or `name — title`. A project page uses `Project — Name`.
- Description: project description (first 160 characters) → `seo.description`
  → `shortBio` (first 160 characters).
- OG image (1200×630 fill): project cover → avatar → first project cover.
- Canonical URL, `openGraph.type` `profile` or `article`, Twitter
  `summary_large_image` when there is an image.
- `seo.noindex` sets the robots meta to `noindex, nofollow`, disallows all in
  robots.txt, and makes the sitemap return 404.
- The home page embeds JSON-LD `Person` (name, jobTitle, description, address, `sameAs`).

### 16.5 Client-side behaviour (`components/portfolio/client.tsx`)

- `RevealObserver` adds the `js` class to `<html>` and fades `.reveal` elements
  up with an IntersectionObserver. Content is visible without JS, and the
  effect is disabled when reduced motion is preferred.
- `ViewBeacon` (live home page only, not the preview) sends one beacon per
  browser session (`sessionStorage` `hub:viewed`) when the browser is idle,
  using `sendBeacon` with a `fetch` fallback.
- `CopyButton` copies the email and shows "Copied" for 1.8 s.

## 17. Functional requirements: admin console

### 17.1 Sign in (`/login`)

A split screen. On the left: the logo with "Hub Console", "Sign in",
"Restricted to authorized administrators.", email and password fields, and a
full-width "Continue" button. Errors appear in a danger alert. The footer note
reads "Protected area. Sign-in attempts are rate-limited." On the right (`lg`
and above): an ink panel with radial gradients (signal green and ember) and a
grid overlay, with the serif tagline "Every portfolio, its own address. All of
them, one place."

### 17.2 Shell

A 248 px sticky left sidebar on `lg` and above. It becomes a top bar below `lg`.
It contains the logo, nav items **Portfolios** (active for `/` and `/sites/*`)
and **Account**, a "Public site" external link (`lg` and above), the admin
email, and **Sign out**. Toasts appear bottom-centre on mobile and bottom-right
on `sm` and above. Success toasts last 3.2 s and error toasts 6 s. At most 4
show at once.

### 17.3 Dashboard (`/`)

- A header with "Portfolios", a subtitle, and a primary **New portfolio** button.
- A metric strip: Portfolios, Published, Drafts, Total views (compact number format).
- A card with filter tabs (All, Published, Drafts, Archived, each with a count)
  and a search box (name, subdomain or title, client-side).
- Rows: avatar (or initials), name (the whole row links to the editor), a status
  badge, the host in mono text, the project count, views, the updated date, a
  copy-link button, and an open-live-site button (published only).
- Empty state: "No portfolios yet". No search results: "Nothing matches your search."
- **New portfolio dialog:** Full name (auto-fills the slug until the slug is
  edited by hand), Professional title, and Subdomain with a `.root` suffix and a
  live debounced (350 ms) availability check (spinner, check or cross icon).
  Create is enabled only when the name is filled and the slug is available. On
  success the draft is created and the editor opens.

### 17.4 Portfolio editor (`/sites/<id>`)

**Top bar** (sticky): back arrow, name and status badge, the host (a link when
published), an "Unsaved changes" indicator (warn dot), **Preview** (new tab;
shows saved content), **Save** (disabled when nothing changed; Ctrl/Cmd+S), and
**Publish** (primary) or **Unpublish** (secondary). Publishing with unsaved
changes is blocked with an error toast. A warn-coloured banner appears when the
portfolio is not published, with a "Preview draft" link.

**Draft model:** profile content (everything in `profileContentSchema`) is held
in a client draft. `dirty` compares the JSON of the draft with the last saved
snapshot. A `beforeunload` warning fires while dirty. On save, validation errors
are mapped by `tabForPath()` to the tab that owns the first error, which then
opens. Tabs with errors show a red dot. **Projects, status and slug are saved
immediately** through their own actions and are not part of the draft.

**Tabs** (left nav on `lg` and above, horizontal scroller below):

| Group | Tab | Panel | Fields |
| --- | --- | --- | --- |
| Content | Profile | `IdentityPanel` | Portrait (4:5 MediaField), Full name, Professional title, Introduction (short bio, counter 400), Availability, Location |
| Content | About | `AboutPanel` | Biography (counter 6000) |
| Content | Expertise | `ExpertisePanel` | Skills (TagInput, max 40); Services (ListEditor, max 20: title, description) |
| Content | Work | `ProjectsPanel` | Project list (see below) |
| Content | Experience | `ExperiencePanel` | ListEditor, max 30: role, company, period, summary |
| Content | Clients | `ClientsPanel` | ListEditor, max 60: name, website |
| Content | Contact | `ContactPanel` | Email, phone; social links (ListEditor, max 16: platform select, URL, label when "other") |
| Design | Sections | `LayoutPanel` | For each section: visibility toggle, move up/down, label override, intro line ("Closing headline" for contact) |
| Design | Appearance | `AppearancePanel` | Colour mode, accent swatches, headline type, hero, work layout. Each option is a card with a mini preview. |
| Publishing | Search & sharing | `SeoPanel` | Search-result preview, page title (70), description (170), "Hide from search engines" switch |
| Publishing | Address & status | `SettingsPanel` | Status cards (Published, Draft, Archived), subdomain change ("Update address"), a danger-zone delete that requires typing the slug |

**Projects panel:** numbered rows with a cover thumbnail, title, a featured star,
a film icon, a "Hidden" tag, and a meta line. Actions: move up/down (optimistic,
reverted on error), show/hide (optimistic), edit, and delete (confirmation
dialog). There is an empty state with an add button.

**Project dialog** (large): Title (required), Discipline, Client, Year, External
link; Cover image (16:9); Film (segmented control None / Upload / YouTube-Vimeo
link, where the link must parse); Description (counter 8000); Gallery (up to 24
images or videos; multi-select upload with "Uploading i of n · p%"; reorder
left/right; remove); Tools (TagInput, max 20, 40 characters each); switches
"Feature this project" and "Hide from the site". The dialog cannot be closed
while saving or uploading.

### 17.5 Preview (`/preview/<id>`)

Shows any status. A dark `PreviewBar` ("Back to editor" · host · status) sits
above the real `Portfolio` renderer with `hrefBase="/preview/<id>"`. Hidden
projects are excluded from the list but can be opened directly. Preview never
counts views.

### 17.6 Account (`/account`)

An email card (read-only, mono) and a password card (current, new, confirm). On
success the form resets and a toast reads "Password updated". A hidden username
field helps password managers.

## 18. UI and design system

The product has **two visual languages** that must stay separate:

1. **Console:** a calm, neutral, utilitarian SaaS look. Warm greys, ink-black
   primary, one green signal colour.
2. **Portfolio surface** (public sites, landing page, 404 pages): editorial and
   gallery-like, with large display serif type, generous whitespace, thin hairline
   rules, and a single accent colour.

### 18.1 Typography

| Token | Font | Use |
| --- | --- | --- |
| `--font-sans` / `font-sans` | Geist (`--font-geist`) | Console UI, portfolio body text, the grotesk display option |
| `--font-mono` / `font-mono` | Geist Mono | Slugs, hosts, counters, numbering, `.eyebrow` |
| `--font-serif` / `font-serif` | Instrument Serif 400, normal and italic | Portfolio `.display` headings (default), login tagline |

Body text uses `font-feature-settings: 'ss01', 'cv11'` and antialiasing.

Console type scale (from usage): page title `22px semibold tracking-tight`; card
title `15px semibold`; body `text-sm` (14px); labels and secondary text `13px`;
hints and meta `12px`; counters `11px mono`.

Portfolio type: `.display` is serif 400, `letter-spacing: -0.02em`,
`line-height: 0.95`. With `data-heading="sans"` it becomes sans 600,
`-0.045em`, `0.92`. `.eyebrow` is mono, 0.72 rem, `0.14em` tracking, uppercase.
Display sizes use fluid `clamp()` values.

### 18.2 Console colour tokens (`@theme` in `globals.css`)

| Token | Hex | Use |
| --- | --- | --- |
| `canvas` | `#f6f6f4` | Page background |
| `surface` | `#ffffff` | Cards, inputs, dialogs |
| `subtle` | `#f0efec` | Hover and active fills, chips |
| `line` | `#e5e4e0` | Borders and dividers |
| `line-strong` | `#d3d2cd` | Hover borders, dashed drop zones |
| `ink` | `#151513` | Primary text, primary buttons, focus ring |
| `ink-2` | `#3a3a36` | Secondary text, primary hover |
| `muted` | `#6b6a65` | Descriptions |
| `faint` | `#9a9993` | Placeholders, counters |
| `signal` / `signal-soft` | `#0f7a62` / `#e3f1ec` | Published state, success |
| `warn` / `warn-soft` | `#a86812` / `#f8eedd` | Draft state, unsaved changes, featured star |
| `danger` / `danger-soft` | `#b83227` / `#f9e6e3` | Errors, destructive actions |

Radii: `xs 4`, `sm 6`, `md 8` (controls), `lg 12`, `xl 16` (cards use
`rounded-xl`). Shadows: `shadow-card` (subtle 1–2 px), `shadow-pop` (dialogs,
toasts). Easing: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`. Focus:
2 px ink outline with a 2 px offset. Selection is ink on white.

### 18.3 Portfolio theme system (`.portfolio` scope)

The root element sets `data-mode`, `data-accent` and `data-heading`. CSS
variables:

| Var | Dark (default) | Light |
| --- | --- | --- |
| `--p-bg` | `#0c0c0b` | `#f5f3ee` |
| `--p-fg` | `#f1efea` | `#141412` |
| `--p-muted` | `#9c9a93` | `#66645e` |
| `--p-line` | `rgb(241 239 234 / .12)` | `rgb(20 20 18 / .12)` |
| `--p-soft` | `rgb(241 239 234 / .05)` | `rgb(20 20 18 / .04)` |
| `--p-accent-fg` | `#0c0c0b` | `#ffffff` |

Accents (`--p-accent`): ember `#e4572e`, saffron `#d99a1e` (light `#b67c0c`),
teal `#17a085` (light `#0f8069`), cobalt `#3d6bea`, moss `#6f9a3a` (light
`#557a26`), mono = `--p-fg` (with `--p-accent-fg = --p-bg`). Light-mode
overrides exist for contrast. The console swatches in `panels.tsx`
(`ACCENT_SWATCH`) must match.

Portfolio components use only the `var(--p-*)` variables through Tailwind
arbitrary values (`text-[var(--p-muted)]`, `border-[var(--p-line)]`…). They
never use console tokens.

Layout conventions: content max width `1440px`; gutters `px-5 sm:px-8
lg:px-12`; section padding `py-20 md:py-28`; 12-column grids on `md`/`lg` and
above; images use `rounded-[2px]`; sections are separated by `border-t
border-[var(--p-line)]`; pills (`rounded-full`) for CTAs and tags.

Motion: `.reveal` fades and lifts 18 px over 0.9 s with the expo ease, only when
`prefers-reduced-motion: no-preference`. `.media-zoom` scales images 1.035 on
hover over 1.1 s, on hover-capable devices only. Arrow icons nudge on hover.

### 18.4 Console component library (`components/ui/primitives.tsx`)

| Component | API summary |
| --- | --- |
| `cn(...classes)` | Joins truthy class names. It does not use tailwind-merge, so when two utilities conflict, CSS order decides the winner, not argument order. Avoid passing conflicting overrides. |
| `Button` | `variant`: primary, secondary (default), ghost, subtle, danger. `size`: sm (h-8), md (h-9, default), lg (h-11), icon (size-9), icon-sm (size-7). `loading` shows a spinner and disables. Defaults to `type="button"`. |
| `Input` / `Textarea` / `Select` | Shared `control` style: h-9, md radius, ink focus border plus a 3 px ink/8 ring, and a danger border when `aria-invalid`. Select has a custom chevron. |
| `Field` | Render-prop label wrapper: `label`, `hint`, `error`, `counter {value,max}`. Passes `id`, `aria-invalid` and `aria-describedby` to the child. |
| `Switch` | Accessible `role="switch"` with a label and description |
| `Card`, `CardHeader` | `rounded-xl border bg-surface shadow-card`. The header has a title, description, actions and a bottom border. |
| `StatusBadge` | Pill with a dot: Published (signal), Draft (warn), Archived (subtle) |
| `Dialog` | Native `<dialog>` with `showModal()`; Esc and backdrop click close it. Sizes md (max-w-md) and lg (max-w-2xl). Max height 85 dvh with a scrollable body and a footer bar. |
| `EmptyState` | Icon tile, title, description, optional action |

Console building blocks: `ListEditor` (rows with up/down/remove and an add
button), `TagInput` (Enter or comma to add, Backspace to remove, paste a CSV,
case-insensitive dedupe), and `MediaField` (aspect-ratio drop zone, drag and
drop, progress overlay, Replace and Remove).

### 18.5 Accessibility requirements

- Every interactive icon-only control has an `aria-label`.
- Form fields are linked to labels and to their hints and errors (`Field`).
- Live regions are used for toasts, the copy button and the unsaved indicator.
- Keyboard: dialogs trap focus natively; all reordering is done with buttons, not
  drag only; visible `:focus-visible` outlines (the accent colour on portfolios).
- Reduced motion is respected for reveal and ping animations.
- Images have meaningful `alt` text on portfolios (portrait, project title,
  gallery index) and empty `alt` for decorative console thumbnails.

### 18.6 Copy and tone

Short, plain, professional sentences in sentence case. Typographic quotes and
dashes (`’`, `“ ”`, `—`, `–`, `…`). Errors say what to do ("Enter a full URL
starting with https://"). No emojis, exclamation marks or jokes.

### 18.7 Brand mark

A rounded square (`rx=8` on 32×32) in ink `#151513` with an "H" drawn in
`#f1efea`, stroke 2.6, round caps. It is used in `icon.svg`, the sidebar, the
login page and the landing page (in `currentColor` there).

## 19. Validation rules and limits

Defined in `src/lib/schemas.ts`. UI `maxLength` values mirror these, and DB
`CHECK` constraints back up most of them.

| Field | Rule |
| --- | --- |
| name | trimmed, 1–120, required |
| title | ≤160 |
| shortBio / fullBio | ≤400 / ≤6000 |
| location / availability | ≤120 |
| email | empty or a valid email ≤254 |
| phone | ≤40, characters `0-9 + ( ) - . space` |
| avatar / cover | image `Media` or null |
| socialLinks | ≤16; platform enum; url `safeUrl`; label ≤40 |
| skills | ≤40 items, each 1–60 |
| services | ≤20; title 1–120; description ≤600 |
| experiences | ≤30; role 1–120; company ≤120; period ≤60; description ≤1000 |
| clients | ≤60; name 1–120; url empty or `safeUrl` |
| sections | exactly `SECTION_KEYS.length`, unique keys; heading ≤60; intro ≤200 |
| theme | enums as in §10.5 |
| seo | title ≤70; description ≤170; noindex boolean |
| slug | trimmed, lowercased, `isValidSlug` (3–40, `[a-z0-9-]`, no leading, trailing or double hyphen, not reserved) |
| project title / category / description | 1–160 / ≤80 / ≤8000 |
| project gallery | ≤24 `Media` (image or video) |
| project tools | ≤20 items, each 1–40 |
| project clientName / projectDate / link | ≤120 / ≤40 / empty or `safeUrl` (≤500) |
| password | 12–128 |
| `safeUrl` | trimmed, ≤500, parseable, protocol `http:` or `https:` |
| `mediaSchema` | publicId pattern (§14), version int > 0, width and height 1–20000, format `[a-z0-9]{2,5}`, duration 0–36000 |

## 20. Configuration, scripts and deployment

### 20.1 Environment variables

| Variable | Exposure | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_ROOT_DOMAIN` | public | yes (default `localhost:3000`) | Root domain. A `localhost` value switches to the `http` protocol. |
| `ADMIN_SUBDOMAIN` | server (proxy, view route) | no (default `admin`) | Console host label |
| `SUPABASE_URL` | server | yes | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | server | yes | Auth only (sign-in and refresh) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | yes | All data access. Never expose it. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | public | yes | Delivery and API URLs |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server | yes | Signing and deletion |

`serverEnv` getters throw `Missing required environment variable: X` lazily when
first used, so a missing variable only breaks the routes that need it.

### 20.2 npm scripts

| Script | Command | Use |
| --- | --- | --- |
| `dev` | `next dev` | Local development on :3000 |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the build |
| `typecheck` | `tsc --noEmit` | **Run before every commit.** It is the only automated check. |
| `create-admin` | `node --env-file=.env.local scripts/create-admin.mjs` | Create or promote an admin. Needs a TTY. |

### 20.3 Database migrations

Files in `supabase/migrations/` are named `YYYYMMDDHHMMSS_description.sql` and
applied in order with `supabase db push` or the SQL editor. Never edit an
applied migration. Add a new one instead.

### 20.4 Deployment (Vercel)

1. Import the repo and set the env vars (`NEXT_PUBLIC_ROOT_DOMAIN=example.com`).
2. Add the domains `example.com` and `*.example.com`. A wildcard needs Vercel nameservers.
3. In Supabase, disable "Allow new users to sign up".
4. Run `npm run create-admin` locally against the production env to create the first admin.

## 21. Change recipes

Use these checklists so that no layer is missed. Each recipe ends with updating
this PRD.

**A. Add a profile field (e.g. `pronouns`)**
1. New migration: `alter table public.profiles add column pronouns text not null default '' check (char_length(pronouns) <= N);`
2. `types.ts`: add to `Profile`.
3. `mappers.ts`: add to `PROFILE_COLUMNS` and `toProfile()`.
4. `schemas.ts`: add to `profileContentSchema`.
5. `_actions/profiles.ts` `saveProfile`: add to the update object.
6. `SiteEditor.tsx`: add to `toDraft()` and the `tabForPath()` map.
7. `panels.tsx`: add a `Field` in the right panel using `maxLength` equal to the schema limit.
8. `Portfolio.tsx` / `ProjectDetail.tsx` / `metadata.ts`: render it. Update `hasContent()` if it affects section visibility.
9. Update this PRD (§10.3, §17.4, §19, and §16 if it is rendered).

**B. Add a project field:** the same as A, using the `projects` table,
`Project`, `PROJECT_COLUMNS`/`toProject`, `projectSchema`, `toRow()` in
`_actions/projects.ts`, `toInput()` in `ProjectDialog.tsx`, and `ProjectDetail.tsx`.

**C. Add a homepage section**
1. `types.ts`: append the key to `SECTION_KEYS` and add a `SECTION_LABELS` entry.
2. Add any data fields (recipe A).
3. `Portfolio.tsx`: add a case to `hasContent()` and `renderSection()`, and write the section component using the existing `Section` wrapper and `.reveal`.
4. Optionally add an editor tab in `SiteEditor.tsx` `TABS` plus a panel.
5. No data migration is needed. `normalizeSections()` appends the new key for existing profiles.

**D. Add an accent colour**
1. `types.ts` `ACCENTS`.
2. `globals.css`: `.portfolio[data-accent='x']` and, if needed for contrast, a light-mode override.
3. `panels.tsx` `ACCENT_SWATCH`.

**E. Add a social platform:** `types.ts` `SOCIAL_PLATFORMS` and `social.ts` `SOCIAL_NAMES`.

**F. Add a Server Action**
1. Put it in the right file in `_actions/`, wrap the body in `guard()`, call `await requireAdmin()` first, and validate every argument with Zod or `uuidSchema`.
2. Return `ok()`, `fail()` or `fromZod()`. Never return raw DB errors.
3. Call `revalidateTag(siteTag(slug), { expire: 0 })` for every affected site, and run Cloudinary cleanup in `after()`.
4. Add it to §11.

**G. Add a console page:** create it under `console/(shell)/<name>/page.tsx`,
call `await requireAdminPage()`, export `metadata.title`, add it to `NAV` in
`Sidebar.tsx` if it needs a nav item, and add it to §12 and §17.

**H. Change reserved slugs:** update `RESERVED_SLUGS` in `hosts.ts` **and** add
a migration that replaces the `profiles_slug_reserved` constraint.

**I. Allow a new external origin** (fonts, embeds, analytics): update the CSP in
`next.config.ts` and §15. Prefer self-hosting.

## 22. Known limitations and technical debt

| Item | Impact | Note |
| --- | --- | --- |
| No automated tests, ESLint config or CI | Regressions are caught only by `npm run typecheck` and manual testing | Some files contain `eslint-disable` comments, but there is no ESLint setup |
| Rate limiter is per-instance memory | Weak on serverless with many instances | Supabase Auth limits still apply. A shared store (e.g. Redis) would be needed for strict limits. |
| Unsaved uploads become orphans | Cloudinary storage can leak when an admin uploads then discards | Possible fix: a periodic sweep comparing the folder with DB references |
| Slug change breaks old links | No redirect from the old subdomain | Documented in the UI |
| `listProfiles()` is capped at 1000 rows | Dashboard does not paginate | Search and filter are client-side |
| `create-admin` scans at most 50 × 200 users | Large Auth user bases may not find an existing user | Fine at intended scale |
| CSP uses `'unsafe-inline'` for scripts and styles | Weaker XSS mitigation | Needed by Next.js inline bootstrapping without nonces |
| Stale comment in `Portfolio.tsx` | The `hrefBase` doc mentions `/sites/<id>/preview`; the real value is `/preview/<id>` | Cosmetic |
| README mentions `.legacy-backup/` | That directory is not in git | Delete it locally when no longer needed |
| English only | No i18n | `lang="en"` is fixed in the root layout |

## 23. Changelog

| Date | Change |
| --- | --- |
| 2026-10-07 | Initial PRD written from the codebase at commit `7a8fe02` (Hub 2.0.0). Added `GUIDELINES.md` and `CLAUDE.md`. |
