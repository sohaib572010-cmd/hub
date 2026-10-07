'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { passwordSchema } from '@/lib/schemas';
import { fail, fromZod, guard, ok, type ActionResult } from './result';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  next: z.string().max(200).optional(),
});

/** Only allow same-origin relative paths as post-login destinations. */
function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export async function login(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: form.get('email'),
    password: form.get('password'),
    next: form.get('next') ?? undefined,
  });
  if (!parsed.success) return fail('Enter your email and password.');

  const ip = clientIp(await headers());
  const byIp = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
  const byEmail = rateLimit(`login:email:${parsed.data.email}`, 8, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) {
    return fail(`Too many attempts. Try again in ${Math.ceil(Math.max(byIp.retryAfter, byEmail.retryAfter) / 60)} min.`);
  }

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Same message for unknown email, wrong password, or non-admin account.
  const generic = 'Incorrect email or password.';
  if (error || !data.user) return fail(generic);

  const { data: admin } = await db().from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return fail(generic);
  }

  redirect(safeNext(parsed.data.next));
}

export async function logout(): Promise<void> {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect('/login');
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password').max(128),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
  .refine((v) => v.next !== v.current, { path: ['next'], message: 'Choose a password you have not used here' });

export async function changePassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const admin = await requireAdmin();
    const parsed = changePasswordSchema.safeParse({
      current: form.get('current'),
      next: form.get('next'),
      confirm: form.get('confirm'),
    });
    if (!parsed.success) return fromZod(parsed.error);

    const limit = rateLimit(`pw:${admin.id}`, 5, 15 * 60_000);
    if (!limit.ok) return fail('Too many attempts. Try again later.');

    const supabase = await authClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: admin.email,
      password: parsed.data.current,
    });
    if (verifyError) return fail('Current password is incorrect.', { current: 'Current password is incorrect' });

    const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
    if (error) return fail(error.message);

    // Sign out every other device that still holds the old session.
    await supabase.auth.signOut({ scope: 'others' });
    return ok(undefined);
  });
}
