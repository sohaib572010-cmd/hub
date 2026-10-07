import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { authClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/admin';

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Resolve the current console user and confirm admin membership.
 * Memoized per request so pages and actions can call it freely.
 */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;

  const { data: row } = await db().from('admins').select('user_id').eq('user_id', sub).maybeSingle();
  if (!row) return null;

  return { id: sub, email: String(data.claims.email ?? '') };
});

/** For Server Components: redirect to the login screen when not an admin. */
export async function requireAdminPage(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/login');
  return admin;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

/** For Server Actions: throw when not an admin. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}
