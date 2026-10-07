'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { Button, Dialog, Field, Input } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { ROOT_DOMAIN, isValidSlug, slugify } from '@/lib/hosts';
import { checkSlug, createProfile } from '../_actions/profiles';

type SlugState = { status: 'idle' | 'checking' | 'ok' | 'bad'; message?: string };

export function NewSiteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      setName('');
      setTitle('');
      setSlug('');
      setSlugEdited(false);
      setSlugState({ status: 'idle' });
      setError(null);
    }
  }, [open]);

  // Debounced availability check.
  useEffect(() => {
    if (!slug) {
      setSlugState({ status: 'idle' });
      return;
    }
    if (!isValidSlug(slug)) {
      setSlugState({ status: 'bad', message: '3–40 lowercase letters, numbers or single hyphens. Some names are reserved.' });
      return;
    }
    setSlugState({ status: 'checking' });
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const res = await checkSlug(slug);
      if (id !== requestId.current) return;
      if (!res.ok) setSlugState({ status: 'bad', message: res.error });
      else setSlugState({ status: res.data.available ? 'ok' : 'bad', message: res.data.message });
    }, 350);
    return () => clearTimeout(timer);
  }, [slug]);

  const onName = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createProfile({ name, title, slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notify('success', 'Portfolio created as a draft');
      onClose();
      router.push(`/sites/${res.data.id}`);
    });
  };

  const canSubmit = name.trim().length > 0 && slugState.status === 'ok' && !pending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New portfolio"
      description="Start with the essentials. Everything else can be added in the editor."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-site" disabled={!canSubmit} loading={pending}>
            Create portfolio
          </Button>
        </>
      }
    >
      <form id="new-site" onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          {(p) => <Input {...p} value={name} onChange={(e) => onName(e.target.value)} maxLength={120} autoFocus required />}
        </Field>
        <Field label="Professional title" hint="For example: Film Director, Brand Designer">
          {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />}
        </Field>
        <Field
          label="Subdomain"
          error={slugState.status === 'bad' ? slugState.message : undefined}
          hint={slugState.status === 'ok' ? 'Available' : 'The portfolio’s permanent address. You can change it later.'}
        >
          {(p) => (
            <div className="flex items-stretch overflow-hidden rounded-md border border-line bg-surface focus-within:border-ink focus-within:ring-3 focus-within:ring-ink/8">
              <input
                {...p}
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40));
                }}
                spellCheck={false}
                autoComplete="off"
                className="h-9 min-w-0 flex-1 bg-transparent px-3 font-mono text-[13px] outline-none"
              />
              <span className="flex items-center gap-2 border-l border-line bg-canvas px-3 font-mono text-[12px] text-muted">
                .{ROOT_DOMAIN}
                <SlugIndicator state={slugState} />
              </span>
            </div>
          )}
        </Field>
        {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

function SlugIndicator({ state }: { state: SlugState }) {
  if (state.status === 'checking') return <Loader2 className="size-3.5 animate-spin text-faint" aria-label="Checking" />;
  if (state.status === 'ok') return <Check className="size-3.5 text-signal" aria-label="Available" />;
  if (state.status === 'bad') return <X className="size-3.5 text-danger" aria-label="Unavailable" />;
  return null;
}
