-- Apply in Supabase SQL editor. Supabase Auth owns accounts; this table stores one draft consultation per owner.
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Consultation',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultations_messages_array check (jsonb_typeof(messages) = 'array')
);

alter table public.consultations enable row level security;
revoke all on public.consultations from anon;
grant select, insert, update, delete on public.consultations to authenticated;

create policy "Owners can read consultations" on public.consultations
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owners can create consultations" on public.consultations
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owners can update consultations" on public.consultations
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners can delete consultations" on public.consultations
  for delete to authenticated using (auth.uid() = owner_id);

create index if not exists consultations_owner_updated_idx on public.consultations(owner_id, updated_at desc);
