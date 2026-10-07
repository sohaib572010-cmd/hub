'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, FileClock, Globe } from 'lucide-react';
import { Button, Card, CardHeader, Dialog, Field, Input, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { ROOT_DOMAIN, isValidSlug } from '@/lib/hosts';
import type { ProfileStatus } from '@/lib/types';
import { deleteProfile, updateSlug } from '../../../_actions/profiles';

const STATUS_OPTIONS: Array<{ value: ProfileStatus; title: string; description: string; icon: typeof Globe }> = [
  { value: 'published', title: 'Published', description: 'Live at its address for anyone with the link.', icon: Globe },
  { value: 'draft', title: 'Draft', description: 'Private. Only visible in the console preview.', icon: FileClock },
  { value: 'archived', title: 'Archived', description: 'Private and set aside. Keeps all content.', icon: Archive },
];

export function SettingsPanel({
  profileId,
  slug,
  status,
  onSlugChange,
  onStatusChange,
  statusPending,
}: {
  profileId: string;
  slug: string;
  status: ProfileStatus;
  onSlugChange: (slug: string) => void;
  onStatusChange: (status: ProfileStatus) => void;
  statusPending: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [nextSlug, setNextSlug] = useState(slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, startSlug] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, startDelete] = useTransition();

  const saveSlug = () => {
    if (!isValidSlug(nextSlug)) {
      setSlugError('Use 3–40 lowercase letters, numbers or single hyphens. Some names are reserved.');
      return;
    }
    setSlugError(null);
    startSlug(async () => {
      const res = await updateSlug(profileId, nextSlug);
      if (!res.ok) {
        setSlugError(res.error);
        return;
      }
      onSlugChange(res.data.slug);
      notify('success', 'Address updated. The previous address no longer works.');
      router.refresh();
    });
  };

  const remove = () => {
    startDelete(async () => {
      const res = await deleteProfile(profileId, confirmText);
      if (!res.ok) return notify('error', res.error);
      notify('success', 'Portfolio deleted');
      router.push('/');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Status" description="Controls who can see this portfolio." />
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
          {STATUS_OPTIONS.map(({ value, title, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              disabled={statusPending || status === value}
              onClick={() => onStatusChange(value)}
              aria-pressed={status === value}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors disabled:cursor-default',
                status === value ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong',
              )}
            >
              <Icon className="mb-3 size-4 text-muted" aria-hidden />
              <p className="text-[13px] font-medium">{title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Address" description="The subdomain this portfolio is served from." />
        <div className="space-y-4 p-5 sm:p-6">
          <Field label="Subdomain" error={slugError ?? undefined} hint="Changing it breaks links shared with the old address.">
            {(p) => (
              <div className="flex max-w-lg items-stretch overflow-hidden rounded-md border border-line bg-surface focus-within:border-ink focus-within:ring-3 focus-within:ring-ink/8">
                <input
                  {...p}
                  value={nextSlug}
                  onChange={(e) => setNextSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40))}
                  spellCheck={false}
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 bg-transparent px-3 font-mono text-[13px] outline-none"
                />
                <span className="flex items-center border-l border-line bg-canvas px-3 font-mono text-[12px] text-muted">.{ROOT_DOMAIN}</span>
              </div>
            )}
          </Field>
          <Button onClick={saveSlug} loading={savingSlug} disabled={nextSlug === slug}>
            Update address
          </Button>
        </div>
      </Card>

      <Card className="border-danger/25">
        <CardHeader title="Delete portfolio" description="Permanently removes the portfolio, its projects and all uploaded media." />
        <div className="p-5 sm:p-6">
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete portfolio
          </Button>
        </div>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText('');
        }}
        title="Delete this portfolio?"
        description="This permanently deletes all content and media. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} disabled={confirmText !== slug} onClick={remove}>
              Delete permanently
            </Button>
          </>
        }
      >
        <Field label={`Type ${slug} to confirm`}>
          {(p) => (
            <Input {...p} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono" />
          )}
        </Field>
      </Dialog>
    </div>
  );
}
