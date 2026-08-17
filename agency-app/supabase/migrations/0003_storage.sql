-- Private bucket for deliverables/attachments. All reads and writes go
-- through server-side code using the service role key (see
-- src/app/actions/attachments.ts and src/app/api/attachments/[id]/view/route.ts),
-- which re-checks permission against the `attachments` table's RLS policies
-- before handing out a signed URL — so no public storage policies are needed.
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;
