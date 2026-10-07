import Link from 'next/link';
import { ArrowUpRight, ArrowDown, Play } from 'lucide-react';
import { CldImage } from '@/components/ui/CldImage';
import { CopyButton, RevealObserver } from './client';
import { SECTION_LABELS, type Profile, type Project, type SectionConfig, type SectionKey } from '@/lib/types';
import { socialLabel } from './social';

type PortfolioProfile = Omit<Profile, 'views'>;

interface Props {
  profile: PortfolioProfile;
  projects: Project[];
  /** Prefix for project detail links, e.g. "" on the live site or "/sites/<id>/preview" in the console. */
  hrefBase?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function hasContent(key: SectionKey, p: PortfolioProfile, projects: Project[]): boolean {
  switch (key) {
    case 'about':
      return Boolean(p.fullBio || p.shortBio);
    case 'expertise':
      return p.skills.length > 0 || p.services.length > 0;
    case 'work':
      return projects.length > 0;
    case 'experience':
      return p.experiences.length > 0;
    case 'clients':
      return p.clients.length > 0;
    case 'contact':
      return Boolean(p.email || p.phone || p.socialLinks.length);
  }
}

export function Portfolio({ profile, projects, hrefBase = '' }: Props) {
  const sections = profile.sections.filter((s) => s.visible && hasContent(s.key, profile, projects));
  const { theme } = profile;

  return (
    <div
      className="portfolio"
      data-mode={theme.mode}
      data-accent={theme.accent}
      data-heading={theme.headingFont}
    >
      <RevealObserver />
      <SiteHeader profile={profile} sections={sections} />
      <main id="top">
        <Hero profile={profile} hasWork={sections.some((s) => s.key === 'work')} />
        {sections.map((section, index) => (
          <Section key={section.key} config={section} index={index + 1}>
            {renderSection(section, profile, projects, hrefBase)}
          </Section>
        ))}
      </main>
      <SiteFooter profile={profile} />
    </div>
  );
}

function renderSection(section: SectionConfig, profile: PortfolioProfile, projects: Project[], hrefBase: string) {
  switch (section.key) {
    case 'about':
      return <About profile={profile} />;
    case 'expertise':
      return <Expertise profile={profile} />;
    case 'work':
      return <Work projects={projects} layout={profile.theme.workLayout} hrefBase={hrefBase} />;
    case 'experience':
      return <Experience profile={profile} />;
    case 'clients':
      return <Clients profile={profile} />;
    case 'contact':
      return <Contact profile={profile} headline={section.intro} />;
  }
}

/* ------------------------------------------------------------------ */

function SiteHeader({ profile, sections }: { profile: PortfolioProfile; sections: SectionConfig[] }) {
  const nav = sections.filter((s) => s.key !== 'contact').slice(0, 4);
  const hasContact = sections.some((s) => s.key === 'contact');
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--p-line)] bg-[var(--p-bg)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--p-bg)_80%,transparent)]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <a href="#top" className="truncate text-[0.95rem] font-medium tracking-tight">
          {profile.name}
        </a>
        <nav aria-label="Sections" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {nav.map((s) => (
              <li key={s.key}>
                <a
                  href={`#${s.key}`}
                  className="rounded-full px-3 py-1.5 text-sm text-[var(--p-muted)] transition-colors hover:text-[var(--p-fg)]"
                >
                  {s.heading || SECTION_LABELS[s.key]}
                </a>
              </li>
            ))}
          </ul>
          {hasContact && (
            <a
              href="#contact"
              className="ml-2 inline-flex h-9 items-center rounded-full bg-[var(--p-accent)] px-4 text-sm font-medium text-[var(--p-accent-fg)] transition-opacity hover:opacity-90"
            >
              Get in touch
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero({ profile, hasWork }: { profile: PortfolioProfile; hasWork: boolean }) {
  const portrait = profile.theme.heroStyle === 'portrait' && profile.avatar;

  const meta = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[var(--p-muted)]">
      {profile.availability && (
        <span className="inline-flex items-center gap-2 text-[var(--p-fg)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--p-accent)] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--p-accent)]" />
          </span>
          {profile.availability}
        </span>
      )}
      {profile.location && <span>{profile.location}</span>}
    </div>
  );

  if (portrait && profile.avatar) {
    return (
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-16 pt-12 sm:px-8 md:pt-20 lg:grid-cols-12 lg:gap-12 lg:px-12 lg:pb-28">
        <div className="flex flex-col justify-end lg:col-span-7">
          {profile.title && <p className="eyebrow mb-6 text-[var(--p-muted)]">{profile.title}</p>}
          <h1 className="display text-[clamp(3.25rem,9vw,8.5rem)]">{profile.name}</h1>
          {profile.shortBio && (
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--p-muted)] sm:text-xl">{profile.shortBio}</p>
          )}
          <div className="mt-10">{meta}</div>
          {hasWork && <ScrollCue />}
        </div>
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-[2px] bg-[var(--p-soft)]">
            <CldImage
              media={profile.avatar}
              alt={`Portrait of ${profile.name}`}
              aspect={4 / 5}
              sizes="(min-width: 1024px) 38vw, 100vw"
              priority
              max={1400}
              className="aspect-[4/5] h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-16 sm:px-8 md:pt-28 lg:px-12 lg:pb-28">
      {profile.title && <p className="eyebrow mb-8 text-[var(--p-muted)]">{profile.title}</p>}
      <h1 className="display text-[clamp(3.5rem,13vw,12rem)]">{profile.name}</h1>
      <div className="mt-12 grid gap-8 border-t border-[var(--p-line)] pt-8 md:grid-cols-12">
        {profile.shortBio && (
          <p className="text-lg leading-relaxed text-[var(--p-muted)] sm:text-xl md:col-span-7">{profile.shortBio}</p>
        )}
        <div className="md:col-span-5 md:justify-self-end">{meta}</div>
      </div>
      {hasWork && <ScrollCue />}
    </section>
  );
}

function ScrollCue() {
  return (
    <a
      href="#work"
      className="mt-12 inline-flex items-center gap-3 text-sm text-[var(--p-muted)] transition-colors hover:text-[var(--p-fg)]"
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-[var(--p-line)]">
        <ArrowDown className="size-4" aria-hidden />
      </span>
      View selected work
    </a>
  );
}

function Section({ config, index, children }: { config: SectionConfig; index: number; children: React.ReactNode }) {
  const label = config.heading || SECTION_LABELS[config.key];
  return (
    <section id={config.key} className="scroll-mt-16 border-t border-[var(--p-line)]">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="reveal mb-12 md:mb-16">
          <div className="flex items-baseline gap-4">
            <span className="eyebrow text-[var(--p-accent)]">{pad(index)}</span>
            <h2 className="eyebrow text-[var(--p-muted)]">{label}</h2>
          </div>
          {config.intro && config.key !== 'contact' && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--p-muted)]">{config.intro}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={className}>
            {p}
          </p>
        ))}
    </>
  );
}

function About({ profile }: { profile: PortfolioProfile }) {
  const body = profile.fullBio || profile.shortBio;
  const [lead, ...rest] = body.split(/\n{2,}/);
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <p className="reveal display text-[clamp(1.9rem,3.6vw,3.4rem)] !leading-[1.08] lg:col-span-9">{lead}</p>
      {rest.length > 0 && (
        <div className="reveal space-y-5 text-lg leading-relaxed text-[var(--p-muted)] lg:col-span-6 lg:col-start-4">
          <Paragraphs text={rest.join('\n\n')} />
        </div>
      )}
    </div>
  );
}

function Expertise({ profile }: { profile: PortfolioProfile }) {
  return (
    <div className="grid gap-16 lg:grid-cols-12">
      {profile.skills.length > 0 && (
        <div className="reveal lg:col-span-4">
          <h3 className="mb-6 text-sm text-[var(--p-muted)]">Capabilities</h3>
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li key={skill} className="rounded-full border border-[var(--p-line)] px-4 py-2 text-sm">
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}
      {profile.services.length > 0 && (
        <ol className={profile.skills.length > 0 ? 'lg:col-span-7 lg:col-start-6' : 'lg:col-span-12'}>
          {profile.services.map((service, i) => (
            <li
              key={service.id}
              className="reveal grid grid-cols-[3rem_1fr] gap-4 border-b border-[var(--p-line)] py-7 first:border-t sm:grid-cols-[4rem_1fr_1.2fr] sm:gap-8"
            >
              <span className="eyebrow pt-1.5 text-[var(--p-muted)]">{pad(i + 1)}</span>
              <h3 className="display text-[1.75rem] !leading-tight sm:text-[2rem]">{service.title}</h3>
              {service.description && (
                <p className="col-start-2 leading-relaxed text-[var(--p-muted)] sm:col-start-3">{service.description}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ProjectMeta({ project }: { project: Project }) {
  const bits = [project.category, project.clientName, project.projectDate].filter(Boolean);
  return <p className="text-sm text-[var(--p-muted)]">{bits.join('  ·  ')}</p>;
}

function ProjectVisual({ project, aspect, sizes }: { project: Project; aspect: number; sizes: string }) {
  const isVideo = Boolean(project.video);
  return (
    <div className="media-zoom relative overflow-hidden rounded-[2px] bg-[var(--p-soft)]" style={{ aspectRatio: aspect }}>
      {project.cover ? (
        <CldImage
          media={project.cover}
          alt={project.title}
          aspect={aspect}
          sizes={sizes}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="display text-4xl text-[var(--p-muted)]">{project.title}</span>
        </div>
      )}
      {isVideo && (
        <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          <Play className="size-3 fill-current" aria-hidden /> Film
        </span>
      )}
    </div>
  );
}

function Work({
  projects,
  layout,
  hrefBase,
}: {
  projects: Project[];
  layout: 'editorial' | 'grid' | 'list';
  hrefBase: string;
}) {
  const href = (p: Project) => `${hrefBase}/work/${p.id}`;

  if (layout === 'list') {
    return (
      <ul className="border-t border-[var(--p-line)]">
        {projects.map((p) => (
          <li key={p.id} className="reveal border-b border-[var(--p-line)]">
            <Link href={href(p)} className="group grid items-center gap-6 py-6 sm:grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_14rem_9rem]">
              <div className="min-w-0">
                <h3 className="display truncate text-[clamp(1.8rem,4vw,3.25rem)] transition-colors group-hover:text-[var(--p-accent)]">
                  {p.title}
                </h3>
                <div className="mt-2">
                  <ProjectMeta project={p} />
                </div>
              </div>
              <div className="hidden w-56 md:block">
                <ProjectVisual project={p} aspect={16 / 10} sizes="224px" />
              </div>
              <span className="hidden items-center justify-end gap-2 text-sm text-[var(--p-muted)] sm:flex">
                View <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (layout === 'grid') {
    return (
      <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2">
        {projects.map((p) => (
          <li key={p.id} className="reveal">
            <Link href={href(p)} className="group block">
              <ProjectVisual project={p} aspect={4 / 3} sizes="(min-width: 768px) 46vw, 100vw" />
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium tracking-tight">{p.title}</h3>
                  <div className="mt-1">
                    <ProjectMeta project={p} />
                  </div>
                </div>
                <ArrowUpRight className="mt-1 size-5 shrink-0 text-[var(--p-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--p-fg)]" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  // Editorial: featured pieces span the full width, others pair up asymmetrically.
  return (
    <ul className="grid gap-x-8 gap-y-16 md:grid-cols-12 md:gap-y-24">
      {projects.map((p, i) => {
        const wide = p.featured;
        const offset = !wide && i % 2 === 1;
        return (
          <li
            key={p.id}
            className={`reveal ${wide ? 'md:col-span-12' : offset ? 'md:col-span-5 md:col-start-8 md:mt-32' : 'md:col-span-6'}`}
          >
            <Link href={href(p)} className="group block">
              <ProjectVisual
                project={p}
                aspect={wide ? 16 / 9 : offset ? 4 / 5 : 5 / 4}
                sizes={wide ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
              />
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={`display ${wide ? 'text-[clamp(2rem,4vw,3.5rem)]' : 'text-[clamp(1.75rem,2.6vw,2.4rem)]'}`}>
                    {p.title}
                  </h3>
                  <div className="mt-2">
                    <ProjectMeta project={p} />
                  </div>
                </div>
                <span className="mt-2 flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--p-line)] transition-colors group-hover:border-[var(--p-accent)] group-hover:bg-[var(--p-accent)] group-hover:text-[var(--p-accent-fg)]">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Experience({ profile }: { profile: PortfolioProfile }) {
  return (
    <ol className="border-t border-[var(--p-line)]">
      {profile.experiences.map((exp) => (
        <li key={exp.id} className="reveal grid gap-3 border-b border-[var(--p-line)] py-8 md:grid-cols-12 md:gap-8">
          <span className="text-sm text-[var(--p-muted)] md:col-span-3">{exp.period}</span>
          <div className="md:col-span-4">
            <h3 className="text-xl font-medium tracking-tight">{exp.role}</h3>
            {exp.company && <p className="mt-1 text-[var(--p-muted)]">{exp.company}</p>}
          </div>
          {exp.description && <p className="leading-relaxed text-[var(--p-muted)] md:col-span-5">{exp.description}</p>}
        </li>
      ))}
    </ol>
  );
}

function Clients({ profile }: { profile: PortfolioProfile }) {
  return (
    <ul className="grid grid-cols-2 border-l border-t border-[var(--p-line)] sm:grid-cols-3 lg:grid-cols-4">
      {profile.clients.map((client) => {
        const inner = <span className="display text-center text-[clamp(1.35rem,2.2vw,2rem)] !leading-tight">{client.name}</span>;
        return (
          <li key={client.id} className="reveal border-b border-r border-[var(--p-line)]">
            {client.url ? (
              <a
                href={client.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex min-h-32 items-center justify-center px-4 py-8 transition-colors hover:bg-[var(--p-soft)]"
              >
                {inner}
              </a>
            ) : (
              <div className="flex min-h-32 items-center justify-center px-4 py-8">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Contact({ profile, headline }: { profile: PortfolioProfile; headline?: string }) {
  return (
    <div>
      <p className="reveal display max-w-5xl text-[clamp(2.75rem,8vw,7.5rem)]">
        {headline ? (
          headline
        ) : (
          <>
            Let&rsquo;s make something <em className="text-[var(--p-accent)]">worth&nbsp;remembering.</em>
          </>
        )}
      </p>
      <div className="mt-16 grid gap-12 border-t border-[var(--p-line)] pt-10 md:grid-cols-12">
        <div className="space-y-6 md:col-span-7">
          {profile.email && (
            <div>
              <p className="mb-2 text-sm text-[var(--p-muted)]">Email</p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={`mailto:${profile.email}`}
                  className="break-all text-[clamp(1.4rem,3vw,2.25rem)] font-medium tracking-tight underline decoration-[var(--p-line)] decoration-1 underline-offset-8 transition-colors hover:decoration-[var(--p-accent)]"
                >
                  {profile.email}
                </a>
                <CopyButton
                  value={profile.email}
                  label="Copy"
                  className="rounded-full border border-[var(--p-line)] px-3 py-1 text-xs text-[var(--p-muted)] transition-colors hover:text-[var(--p-fg)]"
                />
              </div>
            </div>
          )}
          {profile.phone && (
            <div>
              <p className="mb-2 text-sm text-[var(--p-muted)]">Phone</p>
              <a href={`tel:${profile.phone.replace(/[^0-9+]/g, '')}`} className="text-xl tracking-tight hover:text-[var(--p-accent)]">
                {profile.phone}
              </a>
            </div>
          )}
        </div>
        {profile.socialLinks.length > 0 && (
          <ul className="md:col-span-4 md:col-start-9">
            {profile.socialLinks.map((link) => (
              <li key={link.id} className="border-b border-[var(--p-line)] first:border-t">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="group flex items-center justify-between py-4 transition-colors hover:text-[var(--p-accent)]"
                >
                  {socialLabel(link)}
                  <ArrowUpRight className="size-4 text-[var(--p-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-current" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SiteFooter({ profile }: { profile: PortfolioProfile }) {
  return (
    <footer className="border-t border-[var(--p-line)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 text-sm text-[var(--p-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>
          &copy; {new Date().getFullYear()} {profile.name}
        </p>
        <a href="#top" className="transition-colors hover:text-[var(--p-fg)]">
          Back to top
        </a>
      </div>
    </footer>
  );
}
