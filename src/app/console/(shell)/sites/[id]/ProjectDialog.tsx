'use client';

import { useRef, useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import { Button, Dialog, Field, Input, Switch, Textarea, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { TagInput } from '@/components/console/ListEditor';
import { MediaField } from '@/components/console/MediaField';
import { kindOf, uploadToCloudinary } from '@/components/console/upload';
import { imageUrl, parseVideoLink, videoPoster } from '@/lib/media';
import type { ProjectInput } from '@/lib/schemas';
import type { Media, Project, VideoSource } from '@/lib/types';
import { createProject, updateProject } from '../../../_actions/projects';

type VideoMode = 'none' | 'upload' | 'link';

function toInput(p: Project | null): ProjectInput {
  return {
    title: p?.title ?? '',
    category: p?.category ?? '',
    description: p?.description ?? '',
    cover: (p?.cover as ProjectInput['cover']) ?? null,
    gallery: p?.gallery ?? [],
    video: (p?.video as ProjectInput['video']) ?? null,
    tools: p?.tools ?? [],
    clientName: p?.clientName ?? '',
    projectDate: p?.projectDate ?? '',
    link: p?.link ?? '',
    isHidden: p?.isHidden ?? false,
    featured: p?.featured ?? false,
  };
}

function linkFor(video: VideoSource | null): string {
  if (video?.kind === 'youtube') return `https://www.youtube.com/watch?v=${video.id}`;
  if (video?.kind === 'vimeo') return `https://vimeo.com/${video.id}`;
  return '';
}

export function ProjectDialog({
  profileId,
  project,
  onClose,
  onSaved,
}: {
  profileId: string;
  project: Project | null;
  onClose: () => void;
  onSaved: (project: Project, isNew: boolean) => void;
}) {
  const { notify } = useToast();
  const [form, setForm] = useState<ProjectInput>(() => toInput(project));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [videoMode, setVideoMode] = useState<VideoMode>(
    project?.video ? (project.video.kind === 'upload' ? 'upload' : 'link') : 'none',
  );
  const [videoLink, setVideoLink] = useState(linkFor(project?.video ?? null));
  const [pending, start] = useTransition();
  const [galleryProgress, setGalleryProgress] = useState<string | null>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const resolveVideo = (): ProjectInput['video'] | 'invalid' => {
    if (videoMode === 'none') return null;
    if (videoMode === 'upload') return form.video?.kind === 'upload' ? form.video : null;
    if (!videoLink.trim()) return null;
    const parsed = parseVideoLink(videoLink);
    return parsed ?? 'invalid';
  };

  const submit = () => {
    const video = resolveVideo();
    if (video === 'invalid') {
      setErrors({ video: 'Paste a YouTube or Vimeo link' });
      return;
    }
    const payload = { ...form, video };
    start(async () => {
      const res = project ? await updateProject(project.id, payload) : await createProject(profileId, payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        notify('error', res.error);
        return;
      }
      notify('success', project ? 'Project saved' : 'Project added');
      onSaved(res.data, !project);
    });
  };

  const addGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 24 - form.gallery.length);
    const added: Media[] = [];
    for (const [i, file] of list.entries()) {
      const kind = kindOf(file);
      if (!kind) {
        notify('error', `${file.name}: unsupported file type`);
        continue;
      }
      try {
        setGalleryProgress(`Uploading ${i + 1} of ${list.length}…`);
        added.push(await uploadToCloudinary(profileId, file, kind, (f) => setGalleryProgress(`Uploading ${i + 1} of ${list.length} · ${Math.round(f * 100)}%`)));
      } catch (err) {
        notify('error', `${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`);
      }
    }
    setForm((f) => ({ ...f, gallery: [...f.gallery, ...added].slice(0, 24) }));
    setGalleryProgress(null);
    if (galleryInput.current) galleryInput.current.value = '';
  };

  const moveGallery = (index: number, delta: number) => {
    const next = form.gallery.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('gallery', next);
  };

  return (
    <Dialog
      open
      size="lg"
      onClose={() => !pending && !galleryProgress && onClose()}
      title={project ? 'Edit project' : 'New project'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending || Boolean(galleryProgress)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} disabled={Boolean(galleryProgress) || !form.title.trim()}>
            {project ? 'Save project' : 'Add project'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" error={errors.title} className="sm:col-span-2">
            {(p) => <Input {...p} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={160} autoFocus />}
          </Field>
          <Field label="Discipline" hint="e.g. Commercial, Brand identity" error={errors.category}>
            {(p) => <Input {...p} value={form.category} onChange={(e) => set('category', e.target.value)} maxLength={80} />}
          </Field>
          <Field label="Client" error={errors.clientName}>
            {(p) => <Input {...p} value={form.clientName} onChange={(e) => set('clientName', e.target.value)} maxLength={120} />}
          </Field>
          <Field label="Year" error={errors.projectDate}>
            {(p) => <Input {...p} value={form.projectDate} onChange={(e) => set('projectDate', e.target.value)} maxLength={40} placeholder="2025" />}
          </Field>
          <Field label="External link" error={errors.link}>
            {(p) => <Input {...p} type="url" placeholder="https://" value={form.link} onChange={(e) => set('link', e.target.value)} />}
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-medium">Cover image</p>
          <MediaField
            profileId={profileId}
            kind="image"
            aspect={16 / 9}
            value={form.cover}
            onChange={(m) => set('cover', m as ProjectInput['cover'])}
            hint="Landscape, at least 2000px wide works best"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Film</legend>
          <div className="mb-3 inline-flex rounded-md border border-line bg-canvas p-0.5">
            {(['none', 'upload', 'link'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setVideoMode(mode)}
                className={cn(
                  'h-7 rounded px-3 text-[12px] transition-colors',
                  videoMode === mode ? 'bg-surface font-medium text-ink shadow-card' : 'text-muted hover:text-ink',
                )}
              >
                {mode === 'none' ? 'None' : mode === 'upload' ? 'Upload' : 'YouTube / Vimeo'}
              </button>
            ))}
          </div>
          {videoMode === 'upload' && (
            <MediaField
              profileId={profileId}
              kind="video"
              aspect={16 / 9}
              value={form.video?.kind === 'upload' ? form.video.media : null}
              onChange={(m) => set('video', m ? { kind: 'upload', media: { ...m, resourceType: 'video' } } : null)}
              hint="MP4, MOV or WebM, up to 100 MB"
            />
          )}
          {videoMode === 'link' && (
            <Field label="Video link" error={errors.video} hint="The film replaces the cover at the top of the project page.">
              {(p) => (
                <Input
                  {...p}
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://vimeo.com/123456789"
                />
              )}
            </Field>
          )}
        </fieldset>

        <Field
          label="Description"
          error={errors.description}
          counter={{ value: form.description.length, max: 8000 }}
          hint="Separate paragraphs with a blank line."
        >
          {(p) => <Textarea {...p} rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={8000} />}
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[13px] font-medium">Gallery</p>
            <span className="font-mono text-[11px] text-faint">{form.gallery.length}/24</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.gallery.map((m, i) => (
              <div key={m.publicId} className="group relative aspect-square overflow-hidden rounded-md border border-line bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.resourceType === 'video' ? videoPoster(m, 320) : imageUrl(m, { width: 320, height: 320, crop: 'fill' })}
                  alt=""
                  className="size-full object-cover"
                />
                {m.resourceType === 'video' && (
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 font-mono text-[9px] text-white">VIDEO</span>
                )}
                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <div className="flex gap-0.5">
                    <button type="button" aria-label="Move earlier" onClick={() => moveGallery(i, -1)} className="rounded bg-white/90 p-1 text-ink shadow">
                      <ArrowLeft className="size-3" />
                    </button>
                    <button type="button" aria-label="Move later" onClick={() => moveGallery(i, 1)} className="rounded bg-white/90 p-1 text-ink shadow">
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => set('gallery', form.gallery.filter((g) => g.publicId !== m.publicId))}
                    className="rounded bg-white/90 p-1 text-danger shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            ))}
            {form.gallery.length < 24 && (
              <button
                type="button"
                disabled={Boolean(galleryProgress)}
                onClick={() => galleryInput.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong px-2 text-center text-[12px] text-muted transition-colors hover:border-ink-2 hover:text-ink disabled:cursor-wait"
              >
                {galleryProgress ? (
                  <span className="text-[11px] leading-snug">{galleryProgress}</span>
                ) : (
                  <>
                    <Plus className="size-4" aria-hidden /> Add media
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={galleryInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,video/mp4,video/quicktime,video/webm"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => addGallery(e.target.files)}
          />
        </div>

        <Field label="Tools" hint="Software and equipment used." error={errors.tools}>
          {(p) => <TagInput id={p.id} value={form.tools} onChange={(v) => set('tools', v)} max={20} maxLength={40} placeholder="DaVinci Resolve, ARRI Alexa…" />}
        </Field>

        <div className="space-y-4 border-t border-line pt-5">
          <Switch
            label="Feature this project"
            description="In the editorial layout it spans the full width."
            checked={form.featured}
            onChange={(v) => set('featured', v)}
          />
          <Switch
            label="Hide from the site"
            description="Keep it here without showing it publicly."
            checked={form.isHidden}
            onChange={(v) => set('isHidden', v)}
          />
        </div>
      </div>
    </Dialog>
  );
}
