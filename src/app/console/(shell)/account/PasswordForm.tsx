'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button, Field, Input } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { changePassword } from '../../_actions/auth';

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const form = useRef<HTMLFormElement>(null);
  const { notify } = useToast();

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      notify('success', 'Password updated');
    }
  }, [state, notify]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form ref={form} action={action} className="max-w-md space-y-4 p-5 sm:p-6">
      {/* Hidden username field helps password managers associate the new password. */}
      <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden readOnly />
      <Field label="Current password" error={errors.current}>
        {(p) => <Input {...p} name="current" type="password" autoComplete="current-password" required />}
      </Field>
      <Field label="New password" error={errors.next}>
        {(p) => <Input {...p} name="next" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />}
      </Field>
      <Field label="Confirm new password" error={errors.confirm}>
        {(p) => <Input {...p} name="confirm" type="password" autoComplete="new-password" required />}
      </Field>
      {state && !state.ok && !Object.keys(errors).length && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
