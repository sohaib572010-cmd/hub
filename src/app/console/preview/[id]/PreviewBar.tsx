import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { siteHost } from '@/lib/hosts';
import type { ProfileStatus } from '@/lib/types';

export function PreviewBar({ id, slug, status }: { id: string; slug: string; status: ProfileStatus }) {
  return (
    <div className="relative z-50 flex h-10 items-center justify-between gap-4 bg-ink px-4 text-[12px] text-white/80">
      <Link href={`/sites/${id}`} className="inline-flex items-center gap-1.5 hover:text-white">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to editor
      </Link>
      <span className="truncate font-mono">
        Preview · {siteHost(slug)} · {status === 'published' ? 'Published' : status === 'draft' ? 'Draft' : 'Archived'}
      </span>
    </div>
  );
}
