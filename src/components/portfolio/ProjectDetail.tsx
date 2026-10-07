import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { CldImage } from '@/components/ui/CldImage';
import { RevealObserver } from './client';
import { embedUrl, imageUrl, videoPoster, videoUrl } from '@/lib/media';
import type { Profile, Project } from '@/lib/types';

interface Props {
  profile: Omit<Profile, 'views'>;
  project: Project;
  next: Project | null;
  hrefBase?: string;
}

export function ProjectDetail({ profile, project, next, hrefBase = '' }: Props) {
  const { theme } = profile;
  const facts = [
    { label: 'Client', value: project.clientName },
    { label: 'Discipline', value: project.category },
    { label: 'Year', value: project.projectDate },
  ].filter((f) => f.value);

  return (
    <div className="portfolio" data-mode={theme.mode} data-accent={theme.accent} data-heading={theme.headingFont}>
      <RevealObserver />
      <header className="sticky top-0 z-40 border-b border-[var(--p-line)] bg-[color-mix(in_srgb,var(--p-bg)_85%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href={`${hrefBase}/#work`}
            className="inline-flex items-center gap-2 text-sm text-[var(--p-muted)] transition-colors hover:text-[var(--p-fg)]"
          >
            <ArrowLeft className="size-4" aria-hidden /> All work
          </Link>
          <Link href={`${hrefBase}/`} className="truncate text-[0.95rem] font-medium tracking-tight">
            {profile.name}
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-[1440px] px-5 pb-12 pt-14 sm:px-8 md:pt-24 lg:px-12">
          {project.category && <p className="eyebrow mb-6 text-[var(--p-accent)]">{project.category}</p>}
          <h1 className="display max-w-6xl text-[clamp(2.75rem,8vw,7.5rem)]">{project.title}</h1>
          {(facts.length > 0 || project.tools.length > 0 || project.link) && (
            <dl className="mt-14 grid gap-8 border-t border-[var(--p-line)] pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="mb-2 text-sm text-[var(--p-muted)]">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
              {project.tools.length > 0 && (
                <div>
                  <dt className="mb-2 text-sm text-[var(--p-muted)]">Tools</dt>
                  <dd>{project.tools.join(', ')}</dd>
                </div>
              )}
              {project.link && (
                <div>
                  <dt className="mb-2 text-sm text-[var(--p-muted)]">Live</dt>
                  <dd>
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 underline decoration-[var(--p-line)] underline-offset-4 hover:decoration-[var(--p-accent)]"
                    >
                      Visit project <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <section className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <ProjectHeroMedia project={project} />
        </section>

        {project.description && (
          <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12 lg:px-12">
            <h2 className="eyebrow text-[var(--p-muted)] lg:col-span-3">Overview</h2>
            <div className="reveal space-y-6 text-lg leading-relaxed sm:text-xl lg:col-span-8">
              {project.description
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i} className={i === 0 ? '' : 'text-[var(--p-muted)]'}>
                    {p}
                  </p>
                ))}
            </div>
          </section>
        )}

        {project.gallery.length > 0 && (
          <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 md:pb-28 lg:px-12">
            <ul className="grid gap-6 md:grid-cols-2 md:gap-8">
              {project.gallery.map((media, i) => {
                const landscape = media.width >= media.height * 1.25;
                const full = landscape || project.gallery.length === 1 || (i === project.gallery.length - 1 && i % 2 === 0);
                return (
                  <li key={media.publicId} className={`reveal ${full ? 'md:col-span-2' : ''}`}>
                    {media.resourceType === 'video' ? (
                      <video
                        className="w-full rounded-[2px] bg-[var(--p-soft)]"
                        src={videoUrl(media)}
                        poster={videoPoster(media)}
                        controls
                        playsInline
                        preload="none"
                        width={media.width}
                        height={media.height}
                      />
                    ) : (
                      <CldImage
                        media={media}
                        alt={`${project.title} — image ${i + 1}`}
                        sizes={full ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
                        className="h-auto w-full rounded-[2px] bg-[var(--p-soft)]"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {next && (
          <section className="border-t border-[var(--p-line)]">
            <Link
              href={`${hrefBase}/work/${next.id}`}
              className="group mx-auto flex max-w-[1440px] items-end justify-between gap-6 px-5 py-16 sm:px-8 md:py-24 lg:px-12"
            >
              <div>
                <p className="eyebrow mb-4 text-[var(--p-muted)]">Next project</p>
                <p className="display text-[clamp(2.25rem,6vw,5.5rem)] transition-colors group-hover:text-[var(--p-accent)]">
                  {next.title}
                </p>
              </div>
              <span className="mb-3 flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--p-line)] transition-colors group-hover:border-[var(--p-accent)] group-hover:bg-[var(--p-accent)] group-hover:text-[var(--p-accent-fg)]">
                <ArrowRight className="size-5" aria-hidden />
              </span>
            </Link>
          </section>
        )}
      </main>

      <footer className="border-t border-[var(--p-line)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-8 text-sm text-[var(--p-muted)] sm:px-8 lg:px-12">
          <p>
            &copy; {new Date().getFullYear()} {profile.name}
          </p>
          <Link href={`${hrefBase}/#contact`} className="hover:text-[var(--p-fg)]">
            Get in touch
          </Link>
        </div>
      </footer>
    </div>
  );
}

function ProjectHeroMedia({ project }: { project: Project }) {
  const { video, cover } = project;

  if (video?.kind === 'youtube' || video?.kind === 'vimeo') {
    return (
      <div className="relative aspect-video overflow-hidden rounded-[2px] bg-black">
        <iframe
          src={embedUrl(video)}
          title={project.title}
          className="absolute inset-0 size-full"
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
    );
  }

  if (video?.kind === 'upload') {
    const m = video.media;
    return (
      <video
        className="w-full rounded-[2px] bg-black"
        src={videoUrl(m)}
        poster={cover ? imageUrl(cover, { width: 1920 }) : videoPoster(m, 1920)}
        controls
        playsInline
        preload="metadata"
        width={m.width}
        height={m.height}
      />
    );
  }

  if (cover) {
    return (
      <div className="overflow-hidden rounded-[2px] bg-[var(--p-soft)]">
        <CldImage media={cover} alt={project.title} sizes="100vw" priority className="h-auto w-full" />
      </div>
    );
  }

  return null;
}
