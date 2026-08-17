-- Row Level Security: agency staff see everything, client-role users only
-- see their own client's data, and never internal time-tracking or ads data.

create function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('owner', 'admin', 'member')
  );
$$;

create function public.is_client_member(target_client_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from client_members
    where client_id = target_client_id and profile_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table clients enable row level security;
alter table client_members enable row level security;
alter table spaces enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table custom_fields enable row level security;
alter table task_custom_values enable row level security;
alter table comments enable row level security;
alter table attachments enable row level security;
alter table proofing_annotations enable row level security;
alter table time_entries enable row level security;
alter table ad_accounts enable row level security;
alter table ad_campaigns enable row level security;
alter table ad_metrics_daily enable row level security;
alter table ad_creatives enable row level security;
alter table ad_creative_metrics_daily enable row level security;
alter table alerts enable row level security;

-- profiles: everyone can read all profiles (needed for assignee names, @mentions);
-- only the owner can edit their own row, staff can edit any.
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_self_or_staff" on profiles for update
  using (id = auth.uid() or is_staff());

-- clients: staff full access; client-role only their own client row
create policy "clients_staff_all" on clients for all using (is_staff()) with check (is_staff());
create policy "clients_self_select" on clients for select using (is_client_member(id));

create policy "client_members_staff_all" on client_members for all using (is_staff()) with check (is_staff());
create policy "client_members_self_select" on client_members for select using (profile_id = auth.uid());

-- spaces / projects: staff full access; client sees only projects for their client
create policy "spaces_staff_all" on spaces for all using (is_staff()) with check (is_staff());

create policy "projects_staff_all" on projects for all using (is_staff()) with check (is_staff());
create policy "projects_client_select" on projects for select
  using (client_id is not null and is_client_member(client_id));

-- tasks: staff full access; client sees only client_visible tasks on their projects
create policy "tasks_staff_all" on tasks for all using (is_staff()) with check (is_staff());
create policy "tasks_client_select" on tasks for select
  using (
    client_visible = true
    and exists (
      select 1 from projects p
      where p.id = tasks.project_id and p.client_id is not null and is_client_member(p.client_id)
    )
  );

create policy "task_dependencies_staff_all" on task_dependencies for all using (is_staff()) with check (is_staff());
create policy "custom_fields_staff_all" on custom_fields for all using (is_staff()) with check (is_staff());
create policy "task_custom_values_staff_all" on task_custom_values for all using (is_staff()) with check (is_staff());

-- comments: staff full access; client can read/write only client_visible comments
-- on tasks they can see
create policy "comments_staff_all" on comments for all using (is_staff()) with check (is_staff());
create policy "comments_client_select" on comments for select
  using (
    client_visible = true
    and exists (
      select 1 from tasks t join projects p on p.id = t.project_id
      where t.id = comments.task_id and t.client_visible = true
        and p.client_id is not null and is_client_member(p.client_id)
    )
  );
create policy "comments_client_insert" on comments for insert
  with check (
    author_id = auth.uid()
    and client_visible = true
    and exists (
      select 1 from tasks t join projects p on p.id = t.project_id
      where t.id = comments.task_id and t.client_visible = true
        and p.client_id is not null and is_client_member(p.client_id)
    )
  );

-- attachments: staff full access; client sees deliverables on visible tasks,
-- and can update only the approval_status field (enforced in the API layer)
create policy "attachments_staff_all" on attachments for all using (is_staff()) with check (is_staff());
create policy "attachments_client_select" on attachments for select
  using (
    is_deliverable = true
    and exists (
      select 1 from tasks t join projects p on p.id = t.project_id
      where t.id = attachments.task_id and t.client_visible = true
        and p.client_id is not null and is_client_member(p.client_id)
    )
  );
create policy "attachments_client_approve" on attachments for update
  using (
    is_deliverable = true
    and exists (
      select 1 from tasks t join projects p on p.id = t.project_id
      where t.id = attachments.task_id and t.client_visible = true
        and p.client_id is not null and is_client_member(p.client_id)
    )
  );

-- proofing: staff full access; client can read and leave annotations on
-- deliverables they can see
create policy "proofing_staff_all" on proofing_annotations for all using (is_staff()) with check (is_staff());
create policy "proofing_client_select" on proofing_annotations for select
  using (
    exists (
      select 1 from attachments a
      where a.id = proofing_annotations.attachment_id and a.is_deliverable = true
        and exists (
          select 1 from tasks t join projects p on p.id = t.project_id
          where t.id = a.task_id and t.client_visible = true
            and p.client_id is not null and is_client_member(p.client_id)
        )
    )
  );
create policy "proofing_client_insert" on proofing_annotations for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from attachments a
      where a.id = proofing_annotations.attachment_id and a.is_deliverable = true
        and exists (
          select 1 from tasks t join projects p on p.id = t.project_id
          where t.id = a.task_id and t.client_visible = true
            and p.client_id is not null and is_client_member(p.client_id)
        )
    )
  );

-- time tracking & ads BI: internal only, never exposed to client-role users
create policy "time_entries_staff_all" on time_entries for all using (is_staff()) with check (is_staff());
create policy "ad_accounts_staff_all" on ad_accounts for all using (is_staff()) with check (is_staff());
create policy "ad_campaigns_staff_all" on ad_campaigns for all using (is_staff()) with check (is_staff());
create policy "ad_metrics_daily_staff_all" on ad_metrics_daily for all using (is_staff()) with check (is_staff());
create policy "ad_creatives_staff_all" on ad_creatives for all using (is_staff()) with check (is_staff());
create policy "ad_creative_metrics_daily_staff_all" on ad_creative_metrics_daily for all using (is_staff()) with check (is_staff());
create policy "alerts_staff_all" on alerts for all using (is_staff()) with check (is_staff());
