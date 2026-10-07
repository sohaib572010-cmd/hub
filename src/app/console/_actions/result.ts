import 'server-only';
import { z } from 'zod';
import { UnauthorizedError } from '@/lib/auth';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function fromZod(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = error.issues[0];
  return fail(first ? `${first.path.join(' › ') || 'Input'}: ${first.message}` : 'Invalid input', fieldErrors);
}

/** Convert thrown errors into safe, generic results. Details stay in server logs. */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UnauthorizedError) return fail('Your session has expired. Sign in again.');
    if (err && typeof err === 'object' && 'digest' in err) throw err; // let Next.js redirects/notFound through
    console.error('[action]', err);
    return fail('Something went wrong. Please try again.');
  }
}
