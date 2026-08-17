-- Agency management app — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ============ People & access ============

create type user_role as enum ('owner', 'admin', 'member', 'client');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  role user_role not null default 'member',
  weekly_capacity_hours numeric not null default 40,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- which client-role profiles may see which client's data
create table client_members (
  client_id uuid not null references clients(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (client_id, profile_id)
);

-- ============ Spaces / Projects / Tasks ============

create table spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create type project_status as enum ('planning', 'active', 'paused', 'completed', 'archived');

create table projects (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  description text,
  status project_status not null default 'planning',
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create type task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references profiles(id),
  due_date date,
  start_date date,
  position numeric not null default 0,
  client_visible boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_id_idx on tasks(project_id);
create index tasks_status_idx on tasks(status);

-- task-to-task dependencies, for the Gantt view
create table task_dependencies (
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  primary key (task_id, depends_on_task_id)
);

create type custom_field_type as enum ('text', 'number', 'currency', 'url', 'select', 'date', 'checkbox');

create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  field_type custom_field_type not null,
  options jsonb not null default '[]',
  position numeric not null default 0
);

create table task_custom_values (
  task_id uuid not null references tasks(id) on delete cascade,
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  value jsonb,
  primary key (task_id, custom_field_id)
);

-- ============ Comments, attachments & proofing ============

create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  is_deliverable boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'changes_requested')),
  created_at timestamptz not null default now()
);

create table proofing_annotations (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references attachments(id) on delete cascade,
  author_id uuid not null references profiles(id),
  x_pct numeric not null,
  y_pct numeric not null,
  timestamp_seconds numeric,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ Time tracking ============

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  note text,
  approved boolean not null default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index time_entries_user_id_idx on time_entries(user_id);
create index time_entries_task_id_idx on time_entries(task_id);

-- ============ Ads BI ============

create type ad_platform as enum ('meta', 'google');

create table ad_accounts (
  id uuid primary key default gen_random_uuid(),
  platform ad_platform not null,
  external_account_id text not null,
  name text not null,
  client_id uuid references clients(id) on delete set null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_by uuid references profiles(id),
  connected_at timestamptz not null default now(),
  unique (platform, external_account_id)
);

create table ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references ad_accounts(id) on delete cascade,
  external_campaign_id text not null,
  name text not null,
  tag text,
  status text,
  unique (ad_account_id, external_campaign_id)
);

create index ad_campaigns_tag_idx on ad_campaigns(tag);

create table ad_metrics_daily (
  ad_campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  date date not null,
  spend numeric not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric not null default 0,
  revenue numeric not null default 0,
  primary key (ad_campaign_id, date)
);

create table ad_creatives (
  id uuid primary key default gen_random_uuid(),
  ad_campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  external_ad_id text not null,
  name text,
  image_url text,
  video_url text,
  headline text,
  body_text text,
  unique (ad_campaign_id, external_ad_id)
);

create table ad_creative_metrics_daily (
  ad_creative_id uuid not null references ad_creatives(id) on delete cascade,
  date date not null,
  spend numeric not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric not null default 0,
  video_3s_views bigint not null default 0,
  video_25_pct bigint not null default 0,
  video_50_pct bigint not null default 0,
  video_75_pct bigint not null default 0,
  video_100_pct bigint not null default 0,
  primary key (ad_creative_id, date)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  ad_campaign_id uuid references ad_campaigns(id) on delete cascade,
  metric text not null,
  message text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ Helper: new-user hook ============

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
