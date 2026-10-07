'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Button, cn } from '@/components/ui/primitives';

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface ListEditorProps<T extends { id: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  addLabel: string;
  max: number;
  emptyText: string;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}

/** Ordered list of editable rows with add, remove and keyboard-accessible reordering. */
export function ListEditor<T extends { id: string }>({
  items,
  onChange,
  create,
  addLabel,
  max,
  emptyText,
  renderItem,
}: ListEditorProps<T>) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">{emptyText}</p>
      )}
      {items.map((item, index) => (
        <div key={item.id} className="group rounded-lg border border-line bg-surface p-4">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              {renderItem(item, (patch) => onChange(items.map((it) => (it.id === item.id ? { ...it, ...patch } : it))), index)}
            </div>
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => onChange(move(items, index, index - 1))}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === items.length - 1}
                onClick={() => onChange(move(items, index, index + 1))}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove"
                className="hover:bg-danger-soft hover:text-danger"
                onClick={() => onChange(items.filter((it) => it.id !== item.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button size="sm" onClick={() => onChange([...items, create()])}>
          <Plus className="size-3.5" aria-hidden /> {addLabel}
        </Button>
      )}
    </div>
  );
}

/** Free-form tags: type and press Enter or comma; paste a comma-separated list. */
export function TagInput({
  value,
  onChange,
  max,
  maxLength = 60,
  placeholder,
  id,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  maxLength?: number;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const incoming = raw
      .split(',')
      .map((t) => t.trim().slice(0, maxLength))
      .filter(Boolean);
    if (!incoming.length) return;
    const seen = new Set(value.map((t) => t.toLowerCase()));
    const next = [...value];
    for (const tag of incoming) {
      if (next.length >= max) break;
      if (!seen.has(tag.toLowerCase())) {
        seen.add(tag.toLowerCase());
        next.push(tag);
      }
    }
    onChange(next);
    setDraft('');
  };

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5 transition-[border-color,box-shadow] focus-within:border-ink focus-within:ring-3 focus-within:ring-ink/8',
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-subtle py-0.5 pl-2 pr-1 text-[12px] text-ink">
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded p-0.5 text-muted hover:bg-line hover:text-ink"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (text.includes(',')) {
              e.preventDefault();
              add(text);
            }
          }}
          placeholder={value.length ? '' : placeholder}
          className="h-6 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-faint"
        />
      )}
    </div>
  );
}
