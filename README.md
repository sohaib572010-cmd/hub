# Hub

Portfolio sites for creative professionals, managed from a private console.
Each person gets their own subdomain (`ahmed.example.com`); the console lives on
its own host (`admin.example.com`) and is never reachable from portfolio
or root domains.

Stack: **Next.js 16** (App Router, React 19) · **Supabase** (Postgres + Auth) ·
**Cloudinary** (images and video) · Tailwind CSS 4.

Full specification: [`PRD.md`](./PRD.md). Rules for changing the code:
[`GUIDELINES.md`](./GUIDELINES.md).

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run create-admin            # interactive; password input is hidden
npm run dev
```

| URL | What |
| --- | --- |
| http://localhost:3000 | Root landing page |
| http://admin.localhost:3000 | Admin console |
| http://&lt;slug&gt;.localhost:3000 | A published portfolio |

`*.localhost` resolves to your machine in Chrome, Edge and Firefox with no
hosts-file changes. (Safari: add entries to `/etc/hosts`.)

The database schema lives in `supabase/migrations/`. It has already been
applied to the configured project; apply it to any new project with the
Supabase CLI (`supabase db push`) or by running the files in the SQL editor.

---

## Environment

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ROOT_DOMAIN` | public | `localhost:3000` locally, `example.com` in production |
| `ADMIN_SUBDOMAIN` | server | Console host label (default `admin`). Use something less guessable if you like. |
| `SUPABASE_URL` | server | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | server | Used only for admin sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | server | All data access. Never sent to the browser. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | public | Appears in every image URL anyway |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server | Upload signing and asset deletion |

`.env.local` is git-ignored. In production, set these in your host's dashboard.

---

## Deploying (Vercel)

1. Import the repo and set the environment variables above, with
   `NEXT_PUBLIC_ROOT_DOMAIN=example.com`.
2. Add the domains `example.com` and `*.example.com` to the project.
   Wildcard domains require the domain to use Vercel's nameservers.
3. In Supabase → Authentication → Providers → Email, **disable "Allow new
   users to sign up"**. Admins are created only with `npm run create-admin`.
   (Even if sign-ups stay on, a non-admin account cannot open the console.)

Any Node host works. Point the apex and a wildcard record at it and make sure
the original `Host` header reaches Next.js.

---

## How it works

### Host routing (`src/proxy.ts`)

| Host | Rewritten to | Notes |
| --- | --- | --- |
| `example.com`, `www.` | `/` | Landing page |
| `admin.example.com` | `/console/*` | Session refreshed; anonymous visitors redirected to `/login` |
| `<slug>.example.com` | `/site/<slug>/*` | Public portfolio |
| anything else | 404 | Invalid labels and nested subdomains |

Direct requests to `/console` or `/site` are always 404, so internal routes
can only be reached through the correct host.

### Performance and resource use

- **Portfolio pages are static (ISR).** Each one is rendered once, cached, and
  served from the CDN (`x-nextjs-cache: HIT`). A save in the console
  invalidates only that portfolio's cache tag, so the database is read once
  per edit, not once per visitor. Traffic spikes hit the CDN, not Postgres.
- **One query per page build.** The profile and its projects come back in a
  single PostgREST call over HTTP, so serverless concurrency never exhausts a
  connection pool.
- **Media never goes through the app server.** The browser uploads straight
  to Cloudinary with a short-lived signature. Delivery URLs negotiate
  AVIF/WebP and quality automatically, and `srcset` serves the smallest
  adequate size. Oversized images are downscaled on ingest to save storage.
- **Storage stays clean.** Replaced or removed media, deleted projects, and
  deleted portfolios are removed from Cloudinary in the background.
- **Fonts are self-hosted** through `next/font`, so there are no third-party
  requests and no layout shift. Client JavaScript on portfolio pages is
  limited to scroll-reveal, copy-email, and the view beacon.
- **View counting** is one atomic SQL increment per visitor every 12 hours,
  sent after the page is idle. Bots and cross-site requests are ignored.

### Security

- RLS is enabled on every table with **no** policies, and `anon` and
  `authenticated` have no table or function grants. The publishable key can
  only sign in; all data access is server-side with the service role.
- Every console page and Server Action re-checks the session **and** admin
  membership (`src/lib/auth.ts`). The proxy is only a fast first gate.
- Passwords are handled only by Supabase Auth (hashed). They are never logged
  or shown: inputs are masked with no reveal toggle, and the CLI reads them
  with echo off. Login errors are generic, and attempts are rate-limited per
  IP and per email on top of Supabase's own limits. Changing a password
  signs out other sessions.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and
  scoped to the console host only, so portfolio subdomains cannot read them.
- All input is validated with Zod. Links accept only `http(s)`. Media
  references must belong to the portfolio's own Cloudinary folder. Videos are
  embedded only from parsed YouTube/Vimeo IDs (no-cookie and DNT players).
- Strict response headers: CSP, HSTS, `frame-ancestors 'none'`, `nosniff`,
  Referrer-Policy, Permissions-Policy, and COOP. The console also sends
  `noindex` and `no-store`.
- Post-login redirects accept only relative paths (no open redirects).
  Server Actions get Next.js's built-in origin check.

### Project layout

```
src/
  proxy.ts                     host routing + console session gate
  app/
    page.tsx                   root landing page
    site/[slug]/               public portfolio (ISR), project pages, robots, sitemap
    api/view/route.ts          view counter (portfolio hosts only)
    console/
      login/                   sign-in
      (shell)/                 dashboard, editor, account (admin only)
      preview/[id]/            draft preview inside the console
      _actions/                Server Actions (auth, profiles, projects)
  components/
    portfolio/                 public site rendering
    console/                   editor building blocks, uploader
    ui/                        primitives, toasts, Cloudinary image
  lib/                         env, hosts, auth, data access, schemas, media
supabase/migrations/           SQL schema
scripts/create-admin.mjs       create or promote an admin
```

The previous Express/Vite version is in `.legacy-backup/` (git-ignored).
Delete it once you no longer need it.
