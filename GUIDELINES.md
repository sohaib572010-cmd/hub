# Modification Guidelines

These rules apply to every change made to this repository, whether a person or
an AI agent makes it. Read [`PRD.md`](./PRD.md) before you start. It describes
the architecture, every file, the data model and the design system.

---

## 1. Code writing guidelines

### 1.1 Core rules

- **Always write clean code.**
- **Do not write prototype code that is unsuitable for production use.** No
  placeholder logic, `TODO` stubs left in shipped paths, mock data, hard-coded
  credentials, `console.log` debugging, commented-out code or "temporary"
  workarounds.
- **Do not write code containing vulnerabilities.**
- **Write code that is organized, clean, readable and easy to modify.**

### 1.2 What "clean and production-ready" means here

- **Match the surrounding code.** Use the same naming, file placement, comment
  density, import style (`@/` alias), quote style (single quotes), two-space
  indentation and semicolons. Comments explain *why*, not *what*.
- **TypeScript strict, no escape hatches.** Do not add `any`, `@ts-ignore`, or
  non-null assertions unless the existing pattern already does so for the same
  reason. Export domain types from `src/lib/types.ts`.
- **One responsibility per module.** Keep data access in `src/lib/data/`,
  mutations in `src/app/console/_actions/`, validation in `src/lib/schemas.ts`,
  URL and host logic in `src/lib/hosts.ts`, and media URL building in
  `src/lib/media.ts`. Do not duplicate these helpers inline.
- **Server/client boundary.** Server-only modules start with
  `import 'server-only'`. Client components (`'use client'`) never import them
  and call Server Actions instead.
- **Reuse before you build.** Use the existing primitives (`Button`, `Field`,
  `Input`, `Card`, `Dialog`, `ListEditor`, `TagInput`, `MediaField`, `CldImage`,
  `useToast`) rather than creating new ones.
- **Handle errors deliberately.** Server Actions return `ActionResult` through
  `ok()`, `fail()` and `fromZod()` inside `guard()`. Never send raw database or
  provider errors to the client. Log details on the server with a `[scope]` prefix.
- **No new dependencies without need.** Prefer the platform and the existing
  libraries. If a dependency is truly needed, choose a maintained, widely used
  package, and record it in the PRD (§5).
- **Database changes go in a new migration file** in `supabase/migrations/`.
  Never edit an applied migration.
- **Verify before committing.** Run `npm run typecheck` and fix every error.
  Test the change in the running app (`npm run dev`, using `admin.localhost:3000`
  and `<slug>.localhost:3000`).

### 1.3 Security rules (mandatory)

| Area | Rule |
| --- | --- |
| Authorization | Every console page calls `requireAdminPage()`. Every Server Action calls `requireAdmin()` as its first statement. The proxy check alone is never enough. |
| Input | Validate every argument from the client with Zod (`src/lib/schemas.ts`), including IDs (`uuidSchema`). Enforce length limits that match the DB constraints. |
| Data access | Use `db()` (service role) only on the server, after authorization or with strict public filters (`status = 'published'`, `is_hidden = false`). Never add RLS policies or grants for `anon`/`authenticated`. Never expose the service-role key or any non-`NEXT_PUBLIC_` variable to the browser. |
| URLs | User-supplied links must pass `safeUrl` (http/https only). External links use `rel="noopener noreferrer"`. |
| Media | Media references must belong to the profile's Cloudinary folder (`hub/<profileId>/`). Embed videos only from parsed IDs (`parseVideoLink` / `embedUrl`). |
| Output | Do not use `dangerouslySetInnerHTML` with user content, except the existing JSON-LD pattern that escapes `<`. Escape XML output. |
| Redirects | Only allow relative, same-origin redirect targets (see `safeNext`). |
| Secrets | Never commit `.env*` files, keys, tokens or passwords. Never log passwords or tokens. |
| Headers | Do not weaken the CSP or security headers in `next.config.ts`. A new external origin must be added deliberately and documented in PRD §15. |
| SQL | Database functions use `set search_path = ''`, and their execute permission is revoked from `public, anon, authenticated`. |
| Caching | After any write to a profile or project, call `revalidateTag(siteTag(slug), { expire: 0 })` for every affected site, so private or stale data is never served. |

### 1.4 Keeping the PRD current

**Update `PRD.md` whenever anything is added to or changed on the site.** This
is part of the change, not a follow-up. Do it in the same commit.

- Update every affected section: routes (§12), data model (§10), Server Actions
  (§11), file tree (§8), dependency map (§9), UI and design tokens (§18),
  validation limits (§19), environment variables (§20) and known limitations (§22).
- Add a dated row to the Changelog (§23) describing the change.
- If you find the PRD out of date while working, correct it.

---

## 2. Design guidelines

### 2.1 Core rules

- **Keep the existing site design unless you are instructed otherwise.**
- **Do not use emojis, amateurish designs, or designs unsuitable for
  professional use.**

### 2.2 How to stay consistent

- **Two separate visual languages.** The console uses the neutral `@theme` tokens
  (`canvas`, `surface`, `line`, `ink`, `muted`, `signal`, `warn`, `danger`…).
  Public portfolio pages use only the `.portfolio` CSS variables
  (`var(--p-bg)`, `var(--p-fg)`, `var(--p-muted)`, `var(--p-line)`,
  `var(--p-soft)`, `var(--p-accent)`). Never mix them.
- **Use tokens, not new colours.** Do not introduce hex values, gradients,
  shadows or radii outside the defined tokens unless the design is being
  deliberately extended. In that case, add a token and document it in PRD §18.
- **Typography.** Geist for UI and body text, Geist Mono for technical values
  (slugs, counters, numbering, eyebrows), and Instrument Serif (or the grotesk
  option) for portfolio display headings. Do not add new fonts.
- **Icons.** Use `lucide-react` only, at the existing sizes (`size-3.5`,
  `size-4`). Icon-only buttons need an `aria-label`.
- **Layout.** Portfolio content uses a max width of `1440px`, gutters
  `px-5 sm:px-8 lg:px-12`, hairline rules and generous vertical space. Console
  pages use cards (`Card` + `CardHeader`) in `max-w-6xl` or `max-w-3xl`
  containers. Everything must be responsive from 320 px upward.
- **Motion.** Keep it subtle: the existing `.reveal`, `.media-zoom` and
  `--ease-out-expo` transitions. Respect `prefers-reduced-motion`. No bouncing,
  spinning or attention-seeking animation.
- **Accessibility.** Keep labelled fields (`Field`), visible focus styles,
  keyboard-operable controls (no drag-only interactions), meaningful `alt` text
  on public images, and sufficient contrast in both portfolio colour modes.
- **Copy.** Plain, concise, professional sentence case. Use typographic
  punctuation (’ “ ” — …). No emojis, exclamation marks, slang or jokes. Error
  messages tell the user what to do.
- **New UI elements** must look like they were always part of the product.
  Before writing new markup, find the closest existing component or pattern and
  follow it.

---

## 3. Pre-commit checklist

- [ ] The change follows the code and design rules above.
- [ ] `npm run typecheck` passes.
- [ ] The change was exercised in the running app (console and/or portfolio host).
- [ ] Authorization, validation and cache invalidation are in place for any new write path.
- [ ] No secrets, debug output, dead code or placeholder content.
- [ ] `PRD.md` is updated, including a Changelog entry.
