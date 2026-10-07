'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Copy, LayoutGrid, Plus, Search } from 'lucide-react';
import { Button, Card, EmptyState, Input, StatusBadge, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { imageUrl } from '@/lib/media';
import { siteHost, siteUrl } from '@/lib/hosts';
import type { Metrics, ProfileStatus, ProfileSummary } from '@/lib/types';
import { NewSiteDialog } from './NewSiteDialog';

const FILTERS: Array<{ key: 'all' | ProfileStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

const numberFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function SitesDashboard({ profiles, metrics }: { profiles: ProfileSummary[]; metrics: Metrics }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ProfileStatus>('all');
  const [creating, setCreating] = useState(false);
  const { notify } = useToast();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter(
      (p) =>
        (filter === 'all' || p.status === filter) &&
        (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.title.toLowerCase().includes(q)),
    );
  }, [profiles, query, filter]);

  const counts = { all: metrics.total, published: metrics.published, draft: metrics.draft, archived: metrics.archived };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Portfolios</h1>
          <p className="mt-1 text-sm text-muted">Create, edit and publish portfolio sites. Each one lives on its own subdomain.</p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> New portfolio
        </Button>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card md:grid-cols-4">
        {[
          ['Portfolios', metrics.total],
          ['Published', metrics.published],
          ['Drafts', metrics.draft],
          ['Total views', metrics.views],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-5 py-4">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{numberFormat.format(Number(value))}</dd>
          </div>
        ))}
      </dl>

      <Card className="mt-8">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex h-8 items-center gap-2 rounded-md px-3 text-[13px] transition-colors',
                  filter === f.key ? 'bg-subtle font-medium text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {f.label}
                <span className="font-mono text-[11px] tabular-nums text-faint">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or subdomain"
              aria-label="Search portfolios"
              className="pl-9"
            />
          </div>
        </div>

        {profiles.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="size-5" />}
            title="No portfolios yet"
            description="Create the first portfolio. It stays a private draft until you publish it."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden /> New portfolio
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted">Nothing matches your search.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((p) => (
              <li key={p.id} className="group relative flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-canvas/70 sm:px-5">
                <Avatar profile={p} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/sites/${p.id}`}
                      className="truncate text-sm font-medium text-ink after:absolute after:inset-0 focus-visible:outline-none"
                    >
                      {p.name}
                    </Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-muted">{siteHost(p.slug)}</p>
                </div>
                <div className="hidden w-28 text-right text-[13px] text-muted md:block">
                  <span className="tabular-nums">{p.projectCount}</span> {p.projectCount === 1 ? 'project' : 'projects'}
                </div>
                <div className="hidden w-24 text-right text-[13px] tabular-nums text-muted md:block">
                  {numberFormat.format(p.views)} views
                </div>
                <div className="hidden w-28 text-right text-[13px] text-muted lg:block">{dateFormat.format(new Date(p.updatedAt))}</div>
                <div className="relative z-10 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Copy link for ${p.name}`}
                    title="Copy link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(siteUrl(p.slug));
                        notify('success', 'Link copied');
                      } catch {
                        notify('error', 'Could not access the clipboard');
                      }
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  {p.status === 'published' && (
                    <a
                      href={siteUrl(p.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${p.name}`}
                      title="Open live site"
                      className="inline-flex size-7 items-center justify-center rounded-md text-ink-2 hover:bg-subtle"
                    >
                      <ArrowUpRight className="size-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NewSiteDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function Avatar({ profile }: { profile: ProfileSummary }) {
  if (profile.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl(profile.avatar, { width: 80, height: 80, crop: 'fill' })}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="size-10 shrink-0 rounded-full bg-subtle object-cover"
      />
    );
  }
  const initials = profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-[13px] font-medium text-ink-2">
      {initials || '–'}
    </span>
  );
}
