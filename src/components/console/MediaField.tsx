'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Film, RefreshCw, Trash2 } from 'lucide-react';
import { Button, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { imageUrl, videoPoster } from '@/lib/media';
import type { Media } from '@/lib/types';
import { ACCEPT_ATTR, uploadToCloudinary } from './upload';

interface Props {
  profileId: string;
  kind: 'image' | 'video';
  value: Media | null;
  onChange: (media: Media | null) => void;
  /** Visual aspect ratio of the drop zone (width / height). */
  aspect?: number;
  hint?: string;
  className?: string;
}

export function MediaField({ profileId, kind, value, onChange, aspect = 16 / 10, hint, className }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const { notify } = useToast();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    try {
      const media = await uploadToCloudinary(profileId, file, kind, setProgress);
      onChange(media);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const Icon = kind === 'image' ? ImagePlus : Film;
  const preview = value
    ? value.resourceType === 'video'
      ? videoPoster(value, 640)
      : imageUrl(value, { width: 640 })
    : null;

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files?.[0]);
        }}
        style={{ aspectRatio: aspect }}
        className={cn(
          'group relative overflow-hidden rounded-lg border bg-canvas transition-colors',
          dragging ? 'border-ink bg-subtle' : value ? 'border-line' : 'border-dashed border-line-strong hover:border-ink-2',
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-card">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="text-[13px] font-medium text-ink">
              {kind === 'image' ? 'Upload image' : 'Upload video'}
            </span>
            <span className="text-[12px] text-muted">{hint ?? 'Drag and drop or click to browse'}</span>
          </button>
        )}

        {value?.resourceType === 'video' && (
          <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
            VIDEO{value.duration ? ` · ${Math.round(value.duration)}s` : ''}
          </span>
        )}

        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/90 backdrop-blur-sm">
            <span className="text-[13px] font-medium tabular-nums">{Math.round(progress * 100)}%</span>
            <div className="h-1 w-1/2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-ink transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {value && progress === null && (
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" onClick={() => input.current?.click()}>
            <RefreshCw className="size-3.5" aria-hidden /> Replace
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </Button>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR[kind]}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </div>
  );
}
