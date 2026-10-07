'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, EyeOff, Film, Images, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Dialog, EmptyState, cn } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { move } from '@/components/console/ListEditor';
import { imageUrl } from '@/lib/media';
import type { Project } from '@/lib/types';
import { deleteProject, reorderProjects, setProjectHidden } from '../../../_actions/projects';
import { ProjectDialog } from './ProjectDialog';

export function ProjectsPanel({ profileId, initial }: { profileId: string; initial: Project[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [projects, setProjects] = useState(initial);
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [pending, start] = useTransition();

  const reorder = (from: number, to: number) => {
    const previous = projects;
    const next = move(projects, from, to);
    if (next === projects) return;
    setProjects(next);
    start(async () => {
      const res = await reorderProjects(profileId, next.map((p) => p.id));
      if (!res.ok) {
        setProjects(previous);
        notify('error', res.error);
      }
    });
  };

  const toggleHidden = (project: Project) => {
    const hidden = !project.isHidden;
    setProjects((list) => list.map((p) => (p.id === project.id ? { ...p, isHidden: hidden } : p)));
    start(async () => {
      const res = await setProjectHidden(project.id, hidden);
      if (!res.ok) {
        setProjects((list) => list.map((p) => (p.id === project.id ? { ...p, isHidden: !hidden } : p)));
        notify('error', res.error);
      } else notify('success', hidden ? 'Project hidden from the site' : 'Project visible on the site');
    });
  };

  const remove = (project: Project) => {
    start(async () => {
      const res = await deleteProject(project.id);
      if (!res.ok) return notify('error', res.error);
      setProjects((list) => list.filter((p) => p.id !== project.id));
      setConfirmDelete(null);
      notify('success', 'Project deleted');
      router.refresh();
    });
  };

  const onSaved = (saved: Project, isNew: boolean) => {
    setProjects((list) => (isNew ? [...list, saved] : list.map((p) => (p.id === saved.id ? saved : p))));
    setEditing(null);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader
        title="Work"
        description="Projects appear in this order. Changes here are saved immediately."
        actions={
          <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-3.5" aria-hidden /> Add project
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<Images className="size-5" />}
          title="No projects yet"
          description="Add the first project with a cover image, and optionally a film and gallery."
          action={
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden /> Add project
            </Button>
          }
        />
      ) : (
        <ul className={cn('divide-y divide-line', pending && 'opacity-90')}>
          {projects.map((project, index) => (
            <li key={project.id} className={cn('flex items-center gap-4 px-4 py-3 sm:px-6', project.isHidden && 'bg-canvas/60')}>
              <span className="hidden w-5 font-mono text-[12px] tabular-nums text-faint sm:block">{String(index + 1).padStart(2, '0')}</span>
              <button
                type="button"
                onClick={() => setEditing(project)}
                className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-md border border-line bg-subtle"
                aria-label={`Edit ${project.title}`}
              >
                {project.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(project.cover, { width: 160, height: 108, crop: 'fill' })}
                    alt=""
                    className={cn('size-full object-cover', project.isHidden && 'opacity-50 grayscale')}
                  />
                ) : (
                  <Images className="m-auto size-4 text-faint" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn('truncate text-sm font-medium', project.isHidden && 'text-muted')}>{project.title}</p>
                  {project.featured && (
                    <span title="Featured" className="text-warn">
                      <Star className="size-3.5 fill-current" aria-label="Featured" />
                    </span>
                  )}
                  {project.video && <Film className="size-3.5 text-muted" aria-label="Has video" />}
                  {project.isHidden && <span className="rounded bg-subtle px-1.5 py-0.5 text-[11px] text-muted">Hidden</span>}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted">
                  {[project.category, project.clientName, project.projectDate].filter(Boolean).join(' · ') || 'No details'}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0 || pending} onClick={() => reorder(index, index - 1)}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={index === projects.length - 1 || pending}
                  onClick={() => reorder(index, index + 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={project.isHidden ? 'Show' : 'Hide'} onClick={() => toggleHidden(project)}>
                  {project.isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setEditing(project)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  className="hover:bg-danger-soft hover:text-danger"
                  onClick={() => setConfirmDelete(project)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ProjectDialog
          profileId={profileId}
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete project?"
        description={`“${confirmDelete?.title ?? ''}” and its uploaded media will be permanently removed.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={pending} onClick={() => confirmDelete && remove(confirmDelete)}>
              Delete project
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-muted">This cannot be undone.</p>
      </Dialog>
    </Card>
  );
}
