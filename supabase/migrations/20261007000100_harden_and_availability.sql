-- Built-in helper shipped with the project; it must not be callable through the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter table public.profiles
  add column availability text not null default '' check (char_length(availability) <= 120);
