'use client';

import { useActionState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui/primitives';
import { login } from '../_actions/auth';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email">
        {(p) => (
          <Input {...p} name="email" type="email" autoComplete="username" required autoFocus spellCheck={false} className="h-10" />
        )}
      </Field>
      <Field label="Password">
        {(p) => (
          // Always masked; there is intentionally no "show password" control.
          <Input {...p} name="password" type="password" autoComplete="current-password" required className="h-10" />
        )}
      </Field>

      {state && !state.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">
        Continue
      </Button>
    </form>
  );
}
