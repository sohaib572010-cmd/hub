-- HUB schema
-- All reads/writes go through the Next.js server using the service role.
-- RLS is enabled on every table with NO policies for anon/authenticated,
-- so the publishable key can never read or write application data directly.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.profile_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- Admins: which auth.users may use the admin console
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: one portfolio site per row, served at <slug>.<root-domain>
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  slug          extensions.citext not null unique,
  name          text not null check (char_length(name) between 1 and 120),
  title         text not null default '' check (char_length(title) <= 160),
  short_bio     text not null default '' check (char_length(short_bio) <= 400),
  full_bio      text not null default '' check (char_length(full_bio) <= 6000),
  location      text not null default '' check (char_length(location) <= 120),
  email         text not null default '' check (char_length(email) <= 254),
  phone         text not null default '' check (char_length(phone) <= 40),
  avatar        jsonb,
  social_links  jsonb not null default '[]'::jsonb,
  skills        text[] not null default '{}',
  services      jsonb not null default '[]'::jsonb,
  experiences   jsonb not null default '[]'::jsonb,
  clients       jsonb not null default '[]'::jsonb,
  sections      jsonb not null default '[]'::jsonb,
  theme         jsonb not null default '{}'::jsonb,
  seo           jsonb not null default '{}'::jsonb,
  status        public.profile_status not null default 'draft',
  views         bigint not null default 0,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- DNS label rules: 3-40 chars, lowercase alnum + inner hyphens
  constraint profiles_slug_format check (slug::text ~ '^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$'),
  constraint profiles_slug_reserved check (slug::text not in (
    'admin','www','api','app','mail','email','smtp','ftp','cdn','static','assets',
    'dashboard','console','auth','login','status','help','support','docs','blog',
    'dev','staging','test','preview','root','hub','system','billing','account'
  )),
  constraint profiles_jsonb_arrays check (
    jsonb_typeof(social_links) = 'array' and jsonb_typeof(services) = 'array'
    and jsonb_typeof(experiences) = 'array' and jsonb_typeof(clients) = 'array'
    and jsonb_typeof(sections) = 'array'
  )
);

create index profiles_status_idx on public.profiles (status);
create index profiles_updated_at_idx on public.profiles (updated_at desc);

-- ---------------------------------------------------------------------------
-- Projects: portfolio work items
-- ---------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 160),
  category     text not null default '' check (char_length(category) <= 80),
  description  text not null default '' check (char_length(description) <= 8000),
  cover        jsonb,
  gallery      jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  video        jsonb,
  tools        text[] not null default '{}',
  client_name  text not null default '' check (char_length(client_name) <= 120),
  project_date text not null default '' check (char_length(project_date) <= 40),
  link         text not null default '' check (char_length(link) <= 500),
  position     integer not null default 0,
  is_hidden    boolean not null default false,
  featured     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_profile_position_idx on public.projects (profile_id, position);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic view counter (only for published profiles)
-- ---------------------------------------------------------------------------
create or replace function public.increment_profile_views(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set views = views + 1
   where slug = p_slug::extensions.citext
     and status = 'published';
$$;

-- Atomic reorder of a profile's projects
create or replace function public.reorder_projects(p_profile_id uuid, p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.projects p
     set position = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
   where p.id = o.id
     and p.profile_id = p_profile_id;
$$;

-- Dashboard metrics in one round trip
create or replace function public.dashboard_metrics()
returns table (total bigint, published bigint, draft bigint, archived bigint, views bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*),
         count(*) filter (where status = 'published'),
         count(*) filter (where status = 'draft'),
         count(*) filter (where status = 'archived'),
         coalesce(sum(views), 0)::bigint
    from public.profiles;
$$;

-- ---------------------------------------------------------------------------
-- Lock everything down to the service role
-- ---------------------------------------------------------------------------
alter table public.admins   enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

revoke all on public.admins, public.profiles, public.projects from anon, authenticated;

revoke execute on function public.increment_profile_views(text)   from public, anon, authenticated;
revoke execute on function public.reorder_projects(uuid, uuid[])  from public, anon, authenticated;
revoke execute on function public.dashboard_metrics()              from public, anon, authenticated;
revoke execute on function public.set_updated_at()                 from public, anon, authenticated;

grant execute on function public.increment_profile_views(text)  to service_role;
grant execute on function public.reorder_projects(uuid, uuid[]) to service_role;
grant execute on function public.dashboard_metrics()            to service_role;
