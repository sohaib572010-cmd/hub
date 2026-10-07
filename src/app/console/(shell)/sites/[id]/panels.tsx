'use client';

import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, Select, Switch, Textarea, cn } from '@/components/ui/primitives';
import { ListEditor, TagInput, move, newId } from '@/components/console/ListEditor';
import { MediaField } from '@/components/console/MediaField';
import { SOCIAL_NAMES } from '@/components/portfolio/social';
import { siteHost } from '@/lib/hosts';
import { ACCENTS, SECTION_LABELS, SOCIAL_PLATFORMS, type Accent, type Theme } from '@/lib/types';
import type { PanelProps } from './SiteEditor';

function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-5 px-5 py-5 sm:px-6', className)}>{children}</div>;
}

/* ---------------- Profile ---------------- */

export function IdentityPanel({ draft, set, errors, profileId }: PanelProps) {
  return (
    <Card>
      <CardHeader title="Profile" description="The first thing visitors see: who this is and what they do." />
      <Body>
        <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Portrait</p>
            <MediaField
              profileId={profileId}
              kind="image"
              aspect={4 / 5}
              value={draft.avatar}
              onChange={(m) => set('avatar', m as typeof draft.avatar)}
              hint="Portrait, at least 1200px tall"
            />
          </div>
          <div className="space-y-5">
            <Field label="Full name" error={errors.name}>
              {(p) => <Input {...p} value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />}
            </Field>
            <Field label="Professional title" error={errors.title} hint="Shown above the name, e.g. Film Director & Cinematographer">
              {(p) => <Input {...p} value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={160} />}
            </Field>
            <Field
              label="Introduction"
              error={errors.shortBio}
              counter={{ value: draft.shortBio.length, max: 400 }}
              hint="One or two sentences under the name."
            >
              {(p) => (
                <Textarea {...p} rows={3} value={draft.shortBio} onChange={(e) => set('shortBio', e.target.value)} maxLength={400} />
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Availability" error={errors.availability} hint="Leave empty to hide. e.g. Available from March">
                {(p) => (
                  <Input {...p} value={draft.availability} onChange={(e) => set('availability', e.target.value)} maxLength={120} />
                )}
              </Field>
              <Field label="Location" error={errors.location}>
                {(p) => <Input {...p} value={draft.location} onChange={(e) => set('location', e.target.value)} maxLength={120} />}
              </Field>
            </div>
          </div>
        </div>
      </Body>
    </Card>
  );
}

/* ---------------- About ---------------- */

export function AboutPanel({ draft, set, errors }: PanelProps) {
  return (
    <Card>
      <CardHeader
        title="About"
        description="The first paragraph is set large as a statement; the rest reads as body copy. Separate paragraphs with a blank line."
      />
      <Body>
        <Field label="Biography" error={errors.fullBio} counter={{ value: draft.fullBio.length, max: 6000 }}>
          {(p) => (
            <Textarea {...p} rows={14} value={draft.fullBio} onChange={(e) => set('fullBio', e.target.value)} maxLength={6000} />
          )}
        </Field>
      </Body>
    </Card>
  );
}

/* ---------------- Expertise ---------------- */

export function ExpertisePanel({ draft, set, errors }: PanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Capabilities" description="Short skills shown as tags. Press Enter or comma to add." />
        <Body>
          <Field label="Skills" error={errors.skills} hint={`${draft.skills.length} of 40`}>
            {(p) => (
              <TagInput id={p.id} value={draft.skills} onChange={(v) => set('skills', v)} max={40} placeholder="Color grading, Motion design…" />
            )}
          </Field>
        </Body>
      </Card>
      <Card>
        <CardHeader title="Services" description="What can be hired for. Numbered in the order shown." />
        <Body>
          <ListEditor
            items={draft.services}
            onChange={(v) => set('services', v)}
            create={() => ({ id: newId(), title: '', description: '' })}
            addLabel="Add service"
            max={20}
            emptyText="No services yet."
            renderItem={(item, update, i) => (
              <div className="grid gap-3">
                <Field label="Title" error={errors[`services.${i}.title`]}>
                  {(p) => <Input {...p} value={item.title} onChange={(e) => update({ title: e.target.value })} maxLength={120} />}
                </Field>
                <Field label="Description" error={errors[`services.${i}.description`]}>
                  {(p) => (
                    <Textarea {...p} rows={2} value={item.description} onChange={(e) => update({ description: e.target.value })} maxLength={600} />
                  )}
                </Field>
              </div>
            )}
          />
        </Body>
      </Card>
    </div>
  );
}

/* ---------------- Experience ---------------- */

export function ExperiencePanel({ draft, set, errors }: PanelProps) {
  return (
    <Card>
      <CardHeader title="Experience" description="Roles and positions, most recent first." />
      <Body>
        <ListEditor
          items={draft.experiences}
          onChange={(v) => set('experiences', v)}
          create={() => ({ id: newId(), role: '', company: '', period: '', description: '' })}
          addLabel="Add role"
          max={30}
          emptyText="No experience added yet."
          renderItem={(item, update, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role" error={errors[`experiences.${i}.role`]}>
                {(p) => <Input {...p} value={item.role} onChange={(e) => update({ role: e.target.value })} maxLength={120} />}
              </Field>
              <Field label="Company">
                {(p) => <Input {...p} value={item.company} onChange={(e) => update({ company: e.target.value })} maxLength={120} />}
              </Field>
              <Field label="Period" hint="e.g. 2021 — Present">
                {(p) => <Input {...p} value={item.period} onChange={(e) => update({ period: e.target.value })} maxLength={60} />}
              </Field>
              <Field label="Summary" className="sm:col-span-2">
                {(p) => (
                  <Textarea {...p} rows={2} value={item.description} onChange={(e) => update({ description: e.target.value })} maxLength={1000} />
                )}
              </Field>
            </div>
          )}
        />
      </Body>
    </Card>
  );
}

/* ---------------- Clients ---------------- */

export function ClientsPanel({ draft, set, errors }: PanelProps) {
  return (
    <Card>
      <CardHeader title="Clients" description="Displayed as a typographic wall. A link is optional." />
      <Body>
        <ListEditor
          items={draft.clients}
          onChange={(v) => set('clients', v)}
          create={() => ({ id: newId(), name: '', url: '' })}
          addLabel="Add client"
          max={60}
          emptyText="No clients added yet."
          renderItem={(item, update, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={errors[`clients.${i}.name`]}>
                {(p) => <Input {...p} value={item.name} onChange={(e) => update({ name: e.target.value })} maxLength={120} />}
              </Field>
              <Field label="Website" error={errors[`clients.${i}.url`]}>
                {(p) => (
                  <Input {...p} type="url" placeholder="https://" value={item.url ?? ''} onChange={(e) => update({ url: e.target.value })} />
                )}
              </Field>
            </div>
          )}
        />
      </Body>
    </Card>
  );
}

/* ---------------- Contact ---------------- */

export function ContactPanel({ draft, set, errors }: PanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Contact details" description="Shown publicly in the contact section. Leave empty to hide." />
        <Body>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email" error={errors.email}>
              {(p) => <Input {...p} type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} maxLength={254} />}
            </Field>
            <Field label="Phone" error={errors.phone}>
              {(p) => <Input {...p} type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} maxLength={40} />}
            </Field>
          </div>
        </Body>
      </Card>
      <Card>
        <CardHeader title="Social & links" description="Listed in the order shown." />
        <Body>
          <ListEditor
            items={draft.socialLinks}
            onChange={(v) => set('socialLinks', v)}
            create={() => ({ id: newId(), platform: 'instagram' as const, url: '', label: '' })}
            addLabel="Add link"
            max={16}
            emptyText="No links yet."
            renderItem={(item, update, i) => (
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <Field label="Platform">
                  {(p) => (
                    <Select {...p} value={item.platform} onChange={(e) => update({ platform: e.target.value as typeof item.platform })}>
                      {SOCIAL_PLATFORMS.map((s) => (
                        <option key={s} value={s}>
                          {SOCIAL_NAMES[s]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="URL" error={errors[`socialLinks.${i}.url`]}>
                  {(p) => (
                    <Input {...p} type="url" placeholder="https://" value={item.url} onChange={(e) => update({ url: e.target.value })} />
                  )}
                </Field>
                {item.platform === 'other' && (
                  <Field label="Label" className="sm:col-span-2">
                    {(p) => <Input {...p} value={item.label ?? ''} onChange={(e) => update({ label: e.target.value })} maxLength={40} />}
                  </Field>
                )}
              </div>
            )}
          />
        </Body>
      </Card>
    </div>
  );
}

/* ---------------- Sections (layout) ---------------- */

export function LayoutPanel({ draft, set, errors }: PanelProps) {
  const sections = draft.sections;
  const update = (index: number, patch: Partial<(typeof sections)[number]>) =>
    set('sections', sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <Card>
      <CardHeader
        title="Sections"
        description="Choose which sections appear, their order, and how they are labelled. Empty sections are hidden automatically."
      />
      <ul className="divide-y divide-line">
        {sections.map((section, index) => (
          <li key={section.key} className={cn('px-5 py-4 sm:px-6', !section.visible && 'bg-canvas/60')}>
            <div className="flex items-center gap-3">
              <span className="w-6 font-mono text-[12px] tabular-nums text-faint">{String(index + 1).padStart(2, '0')}</span>
              <p className={cn('flex-1 text-sm font-medium', !section.visible && 'text-muted')}>{SECTION_LABELS[section.key]}</p>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={section.visible ? 'Hide section' : 'Show section'}
                title={section.visible ? 'Visible' : 'Hidden'}
                onClick={() => update(index, { visible: !section.visible })}
              >
                {section.visible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-faint" />}
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => set('sections', move(sections, index, index - 1))}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === sections.length - 1}
                onClick={() => set('sections', move(sections, index, index + 1))}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            {section.visible && (
              <div className="mt-3 grid gap-3 pl-9 sm:grid-cols-[200px_minmax(0,1fr)]">
                <Field label="Label" hint={`Default: ${SECTION_LABELS[section.key]}`} error={errors[`sections.${index}.heading`]}>
                  {(p) => (
                    <Input
                      {...p}
                      value={section.heading ?? ''}
                      placeholder={SECTION_LABELS[section.key]}
                      onChange={(e) => update(index, { heading: e.target.value })}
                      maxLength={60}
                    />
                  )}
                </Field>
                <Field
                  label={section.key === 'contact' ? 'Closing headline' : 'Intro line'}
                  hint={section.key === 'contact' ? 'Default: Let’s make something worth remembering.' : 'Optional sentence under the label.'}
                  error={errors[`sections.${index}.intro`]}
                >
                  {(p) => (
                    <Input {...p} value={section.intro ?? ''} onChange={(e) => update(index, { intro: e.target.value })} maxLength={200} />
                  )}
                </Field>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Appearance ---------------- */

const ACCENT_SWATCH: Record<Accent, string> = {
  ember: '#e4572e',
  saffron: '#d99a1e',
  teal: '#17a085',
  cobalt: '#3d6bea',
  moss: '#6f9a3a',
  mono: '#151513',
};

function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; title: string; description: string; preview: React.ReactNode }>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'cursor-pointer rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink',
              value === o.value ? 'border-ink bg-surface ring-1 ring-ink' : 'border-line hover:border-line-strong',
            )}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            <div className="mb-3 overflow-hidden rounded-md border border-line">{o.preview}</div>
            <p className="text-[13px] font-medium">{o.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{o.description}</p>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AppearancePanel({ draft, set }: PanelProps) {
  const theme = draft.theme;
  const update = (patch: Partial<Theme>) => set('theme', { ...theme, ...patch });
  const dark = theme.mode === 'dark';
  const bg = dark ? '#0c0c0b' : '#f5f3ee';
  const fg = dark ? '#f1efea' : '#141412';
  const line = dark ? 'rgba(241,239,234,.18)' : 'rgba(20,20,18,.15)';

  return (
    <Card>
      <CardHeader title="Appearance" description="Visual direction for this portfolio. Changes apply after saving." />
      <Body className="space-y-8">
        <OptionGroup
          label="Colour mode"
          value={theme.mode}
          onChange={(mode) => update({ mode })}
          options={[
            {
              value: 'dark',
              title: 'Dark',
              description: 'Cinematic. Best for film and photography.',
              preview: <div className="h-14 bg-[#0c0c0b] p-2"><div className="h-2 w-10 rounded-sm bg-[#f1efea]" /><div className="mt-1.5 h-1.5 w-16 rounded-sm bg-[#f1efea]/30" /></div>,
            },
            {
              value: 'light',
              title: 'Light',
              description: 'Editorial. Best for design and illustration.',
              preview: <div className="h-14 bg-[#f5f3ee] p-2"><div className="h-2 w-10 rounded-sm bg-[#141412]" /><div className="mt-1.5 h-1.5 w-16 rounded-sm bg-[#141412]/25" /></div>,
            },
          ]}
        />

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Accent</legend>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <label
                key={a}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[13px] capitalize transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink',
                  theme.accent === a ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong',
                )}
              >
                <input type="radio" className="sr-only" checked={theme.accent === a} onChange={() => update({ accent: a })} />
                <span className="size-5 rounded-full border border-black/10" style={{ background: ACCENT_SWATCH[a] }} />
                {a === 'mono' ? 'Monochrome' : a}
              </label>
            ))}
          </div>
        </fieldset>

        <OptionGroup
          label="Headline type"
          value={theme.headingFont}
          onChange={(headingFont) => update({ headingFont })}
          options={[
            {
              value: 'serif',
              title: 'Serif',
              description: 'Elegant, editorial display serif.',
              preview: <div className="flex h-14 items-center px-3 font-serif text-2xl" style={{ background: bg, color: fg }}>Aa Studio</div>,
            },
            {
              value: 'sans',
              title: 'Grotesk',
              description: 'Tight, confident sans-serif.',
              preview: <div className="flex h-14 items-center px-3 text-2xl font-semibold tracking-[-0.045em]" style={{ background: bg, color: fg }}>Aa Studio</div>,
            },
          ]}
        />

        <OptionGroup
          label="Hero"
          value={theme.heroStyle}
          onChange={(heroStyle) => update({ heroStyle })}
          options={[
            {
              value: 'portrait',
              title: 'With portrait',
              description: 'Name beside the portrait image.',
              preview: (
                <div className="flex h-14 gap-2 p-2" style={{ background: bg }}>
                  <div className="flex flex-1 flex-col justify-end gap-1"><div className="h-2.5 w-3/4 rounded-sm" style={{ background: fg }} /><div className="h-1 w-1/2 rounded-sm opacity-40" style={{ background: fg }} /></div>
                  <div className="w-8 rounded-sm" style={{ background: line }} />
                </div>
              ),
            },
            {
              value: 'type',
              title: 'Typographic',
              description: 'Oversized name, no image.',
              preview: (
                <div className="flex h-14 flex-col justify-center gap-1.5 p-2" style={{ background: bg }}>
                  <div className="h-4 w-full rounded-sm" style={{ background: fg }} />
                  <div className="h-px w-full" style={{ background: line }} />
                </div>
              ),
            },
          ]}
        />

        <OptionGroup
          label="Work layout"
          value={theme.workLayout}
          onChange={(workLayout) => update({ workLayout })}
          options={[
            {
              value: 'editorial',
              title: 'Editorial',
              description: 'Asymmetric. Featured projects span full width.',
              preview: (
                <div className="grid h-14 grid-cols-5 gap-1 p-2" style={{ background: bg }}>
                  <div className="col-span-3 rounded-sm" style={{ background: line }} />
                  <div className="col-span-2 mt-3 rounded-sm" style={{ background: line }} />
                </div>
              ),
            },
            {
              value: 'grid',
              title: 'Grid',
              description: 'Even two-column grid.',
              preview: (
                <div className="grid h-14 grid-cols-2 gap-1 p-2" style={{ background: bg }}>
                  {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-sm" style={{ background: line }} />)}
                </div>
              ),
            },
            {
              value: 'list',
              title: 'Index',
              description: 'Large titles in a list, thumbnails aside.',
              preview: (
                <div className="flex h-14 flex-col justify-center gap-1.5 p-2" style={{ background: bg }}>
                  {[0, 1, 2].map((i) => <div key={i} className="h-1.5 rounded-sm" style={{ background: line, width: `${80 - i * 15}%` }} />)}
                </div>
              ),
            },
          ]}
        />
      </Body>
    </Card>
  );
}

/* ---------------- SEO ---------------- */

export function SeoPanel({ draft, set, errors, slug }: PanelProps & { slug: string }) {
  const seo = draft.seo;
  const title = seo.title || [draft.name, draft.title].filter(Boolean).join(' — ');
  const description = seo.description || draft.shortBio;
  return (
    <Card>
      <CardHeader title="Search & sharing" description="How this portfolio appears in search results and link previews." />
      <Body>
        <div className="rounded-lg border border-line bg-canvas p-4">
          <p className="truncate text-[12px] text-muted">{siteHost(slug)}</p>
          <p className="mt-1 truncate text-[17px] text-[#1a4fb4]">{title || 'Untitled'}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{description || 'No description yet.'}</p>
        </div>
        <Field label="Page title" error={errors['seo.title']} counter={{ value: (seo.title ?? '').length, max: 70 }} hint="Leave empty to use name and title.">
          {(p) => <Input {...p} value={seo.title ?? ''} onChange={(e) => set('seo', { ...seo, title: e.target.value })} maxLength={70} />}
        </Field>
        <Field
          label="Description"
          error={errors['seo.description']}
          counter={{ value: (seo.description ?? '').length, max: 170 }}
          hint="Leave empty to use the introduction."
        >
          {(p) => (
            <Textarea {...p} rows={3} value={seo.description ?? ''} onChange={(e) => set('seo', { ...seo, description: e.target.value })} maxLength={170} />
          )}
        </Field>
        <div className="border-t border-line pt-5">
          <Switch
            label="Hide from search engines"
            description="Adds noindex. The site stays reachable by anyone with the link."
            checked={Boolean(seo.noindex)}
            onChange={(v) => set('seo', { ...seo, noindex: v })}
          />
        </div>
      </Body>
    </Card>
  );
}
