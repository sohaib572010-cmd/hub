'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Eye,
  FileText,
  Globe,
  Images,
  LayoutList,
  Mail,
  Palette,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { Button, StatusBadge, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { siteHost, siteUrl } from '@/lib/hosts';
import type { ProfileContentInput } from '@/lib/schemas';
import type { Profile, ProfileStatus, Project } from '@/lib/types';
import { saveProfile, setStatus } from '../../../_actions/profiles';
import {
  AboutPanel,
  AppearancePanel,
  ClientsPanel,
  ContactPanel,
  ExperiencePanel,
  ExpertisePanel,
  IdentityPanel,
  LayoutPanel,
  SeoPanel,
} from './panels';
import { ProjectsPanel } from './ProjectsPanel';
import { SettingsPanel } from './SettingsPanel';

export type Draft = ProfileContentInput;

export interface PanelProps {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: Record<string, string>;
  profileId: string;
}

function toDraft(p: Profile): Draft {
  return {
    name: p.name,
    title: p.title,
    shortBio: p.shortBio,
    fullBio: p.fullBio,
    location: p.location,
    email: p.email,
    phone: p.phone,
    availability: p.availability,
    avatar: p.avatar as Draft['avatar'],
    socialLinks: p.socialLinks,
    skills: p.skills,
    services: p.services,
    experiences: p.experiences,
    clients: p.clients,
    sections: p.sections,
    theme: p.theme,
    seo: p.seo,
  };
}

const TABS = [
  { key: 'identity', label: 'Profile', icon: UserRound, group: 'Content' },
  { key: 'about', label: 'About', icon: FileText, group: 'Content' },
  { key: 'expertise', label: 'Expertise', icon: Briefcase, group: 'Content' },
  { key: 'work', label: 'Work', icon: Images, group: 'Content' },
  { key: 'experience', label: 'Experience', icon: LayoutList, group: 'Content' },
  { key: 'clients', label: 'Clients', icon: Building2, group: 'Content' },
  { key: 'contact', label: 'Contact', icon: Mail, group: 'Content' },
  { key: 'layout', label: 'Sections', icon: LayoutList, group: 'Design' },
  { key: 'appearance', label: 'Appearance', icon: Palette, group: 'Design' },
  { key: 'seo', label: 'Search & sharing', icon: Search, group: 'Publishing' },
  { key: 'settings', label: 'Address & status', icon: Settings, group: 'Publishing' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Which editor tab owns a given validation path. */
function tabForPath(path: string): TabKey {
  const root = path.split('.')[0];
  const map: Record<string, TabKey> = {
    name: 'identity', title: 'identity', shortBio: 'identity', availability: 'identity', location: 'identity', avatar: 'identity',
    fullBio: 'about', skills: 'expertise', services: 'expertise', experiences: 'experience', clients: 'clients',
    email: 'contact', phone: 'contact', socialLinks: 'contact', sections: 'layout', theme: 'appearance', seo: 'seo',
  };
  return map[root] ?? 'identity';
}

export function SiteEditor({ profile, projects }: { profile: Profile; projects: Project[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [tab, setTab] = useState<TabKey>('identity');
  const [saved, setSaved] = useState<Draft>(() => toDraft(profile));
  const [draft, setDraft] = useState<Draft>(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setLocalStatus] = useState<ProfileStatus>(profile.status);
  const [slug, setSlug] = useState(profile.slug);
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const save = useCallback(() => {
    if (!dirty || saving) return;
    startSave(async () => {
      const snapshot = draft;
      const res = await saveProfile(profile.id, snapshot);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) setTab(tabForPath(first));
        notify('error', res.error);
        return;
      }
      setErrors({});
      setSaved(snapshot);
      notify('success', status === 'published' ? 'Saved and live' : 'Changes saved');
      router.refresh();
    });
  }, [dirty, saving, draft, profile.id, notify, status, router]);

  // Cmd/Ctrl+S to save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const changeStatus = (next: ProfileStatus) => {
    if (dirty && next === 'published') {
      notify('error', 'Save your changes before publishing.');
      return;
    }
    startPublish(async () => {
      const res = await setStatus(profile.id, next);
      if (!res.ok) return notify('error', res.error);
      setLocalStatus(next);
      notify(
        'success',
        next === 'published' ? 'Portfolio is live' : next === 'draft' ? 'Moved to drafts — no longer public' : 'Archived',
      );
      router.refresh();
    });
  };

  const panelProps: PanelProps = { draft, set, errors, profileId: profile.id };
  const groups = [...new Set(TABS.map((t) => t.group))];
  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-14 z-20 border-b border-line bg-surface/90 backdrop-blur lg:top-0">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Back to portfolios" className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-[15px] font-semibold tracking-tight">{draft.name || 'Untitled'}</h1>
              <StatusBadge status={status} />
            </div>
            <a
              href={status === 'published' ? siteUrl(slug) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'mt-0.5 inline-flex items-center gap-1 font-mono text-[12px] text-muted',
                status === 'published' && 'hover:text-ink',
              )}
            >
              <Globe className="size-3" aria-hidden />
              {siteHost(slug)}
              {status === 'published' && <ArrowUpRight className="size-3" aria-hidden />}
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'hidden items-center gap-1.5 text-[12px] text-muted transition-opacity sm:flex',
                dirty ? 'opacity-100' : 'opacity-0',
              )}
              aria-live="polite"
            >
              <span className="size-1.5 rounded-full bg-warn" aria-hidden />
              Unsaved changes
            </span>
            <a
              href={`/preview/${profile.id}`}
              target="_blank"
              rel="noopener"
              className="hidden h-9 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-medium shadow-card hover:border-line-strong sm:inline-flex"
              title={dirty ? 'Preview shows saved content' : 'Open preview'}
            >
              <Eye className="size-4" aria-hidden /> Preview
            </a>
            <Button onClick={save} disabled={!dirty} loading={saving} title="Save (Ctrl+S)">
              Save
            </Button>
            {status === 'published' ? (
              <Button variant="secondary" onClick={() => changeStatus('draft')} loading={publishing}>
                Unpublish
              </Button>
            ) : (
              <Button variant="primary" onClick={() => changeStatus('published')} loading={publishing}>
                Publish
              </Button>
            )}
          </div>
        </div>
        {status !== 'published' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-warn/20 bg-warn-soft px-4 py-2.5 text-[13px] text-warn sm:px-6">
            <p>
              {status === 'draft' ? 'This portfolio is a private draft.' : 'This portfolio is archived.'} Visitors to{' '}
              <span className="font-mono">{siteHost(slug)}</span> see a “not available” page until you publish it.
            </p>
            <a href={`/preview/${profile.id}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
              Preview draft
            </a>
          </div>
        )}
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 lg:py-8">
        {/* Section navigation */}
        <nav aria-label="Editor sections" className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {groups.map((group) => (
              <div key={group} className="contents lg:block">
                <p className="mb-1.5 hidden px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-faint lg:block">{group}</p>
                <ul className="contents lg:block lg:space-y-0.5">
                  {TABS.filter((t) => t.group === group).map(({ key, label, icon: Icon }) => {
                    const hasError = Object.keys(errors).some((p) => tabForPath(p) === key);
                    return (
                      <li key={key} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setTab(key)}
                          aria-current={tab === key ? 'page' : undefined}
                          className={cn(
                            'flex h-8 w-full items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 text-[13px] transition-colors',
                            tab === key ? 'bg-surface font-medium text-ink shadow-card ring-1 ring-line' : 'text-muted hover:text-ink',
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          {label}
                          {hasError && <span className="ml-auto size-1.5 rounded-full bg-danger" aria-label="Has errors" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0 pb-24" aria-label={activeTab.label}>
          {tab === 'identity' && <IdentityPanel {...panelProps} />}
          {tab === 'about' && <AboutPanel {...panelProps} />}
          {tab === 'expertise' && <ExpertisePanel {...panelProps} />}
          {tab === 'work' && <ProjectsPanel profileId={profile.id} initial={projects} />}
          {tab === 'experience' && <ExperiencePanel {...panelProps} />}
          {tab === 'clients' && <ClientsPanel {...panelProps} />}
          {tab === 'contact' && <ContactPanel {...panelProps} />}
          {tab === 'layout' && <LayoutPanel {...panelProps} />}
          {tab === 'appearance' && <AppearancePanel {...panelProps} />}
          {tab === 'seo' && <SeoPanel {...panelProps} slug={slug} />}
          {tab === 'settings' && (
            <SettingsPanel
              profileId={profile.id}
              slug={slug}
              status={status}
              onSlugChange={setSlug}
              onStatusChange={changeStatus}
              statusPending={publishing}
            />
          )}
        </main>
      </div>
    </div>
  );
}
