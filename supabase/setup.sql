-- =====================================================================
-- alternance-et-moi — Setup complet de la base Supabase
-- À exécuter dans le SQL Editor d'un NOUVEAU projet Supabase.
-- Recrée : table `reports`, RLS, bucket Storage `reports` + policies.
-- Reconstruit à partir du code (aucune donnée à migrer : base d'origine vide).
-- =====================================================================

-- 1. TABLE reports -----------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  title       text not null,
  content     text,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists reports_date_idx    on public.reports (date desc);

-- 2. RLS : chaque utilisateur ne voit/gère que ses propres rapports ----
alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own" on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports
  for delete using (auth.uid() = user_id);

-- 3. STORAGE : bucket `reports` (public en lecture) --------------------
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do update set public = true;

-- Lecture publique (l'app utilise getPublicUrl)
drop policy if exists "reports_storage_read" on storage.objects;
create policy "reports_storage_read" on storage.objects
  for select using (bucket_id = 'reports');

-- Écriture / suppression réservées aux utilisateurs connectés
drop policy if exists "reports_storage_insert" on storage.objects;
create policy "reports_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'reports');

drop policy if exists "reports_storage_update" on storage.objects;
create policy "reports_storage_update" on storage.objects
  for update to authenticated using (bucket_id = 'reports');

drop policy if exists "reports_storage_delete" on storage.objects;
create policy "reports_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'reports');
