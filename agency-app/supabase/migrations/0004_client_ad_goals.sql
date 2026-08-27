-- Per-client targets used to compute the traffic-light status on the ads
-- dashboard: how spend is pacing against the monthly budget, and whether
-- ROAS / cost-per-result are hitting their targets.
create table client_ad_goals (
  client_id uuid primary key references clients(id) on delete cascade,
  monthly_budget numeric,
  target_roas numeric,
  target_cpa numeric,
  revenue_goal numeric,
  updated_at timestamptz not null default now()
);

alter table client_ad_goals enable row level security;
create policy "client_ad_goals_staff_all" on client_ad_goals for all using (is_staff()) with check (is_staff());
