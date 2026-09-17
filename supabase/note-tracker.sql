-- =====================================================================
-- alternance-et-moi — Module "Note Tracker"
-- À exécuter dans le SQL Editor du projet Supabase.
-- Crée : formations, ues (unités d'enseignement), grades (notes) + RLS.
-- =====================================================================

-- Fonction updated_at (idempotente, partagée avec les autres modules)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. FORMATIONS --------------------------------------------------------
create table if not exists public.formations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  school         text,
  level          text,   -- ex. "BTS SIO 2e année"
  academic_year  text,   -- ex. "2025-2026"
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists formations_user_id_idx on public.formations (user_id);

-- 2. UE (Unités d'Enseignement) ---------------------------------------
create table if not exists public.ues (
  id            uuid primary key default gen_random_uuid(),
  formation_id  uuid not null references public.formations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists ues_formation_id_idx on public.ues (formation_id);
create index if not exists ues_user_id_idx on public.ues (user_id);

-- 3. GRADES (Notes) ----------------------------------------------------
create table if not exists public.grades (
  id           uuid primary key default gen_random_uuid(),
  ue_id        uuid not null references public.ues(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text,
  value        numeric(5,2) not null check (value >= 0 and value <= 20),
  coefficient  numeric(5,2) not null default 1 check (coefficient > 0),
  created_at   timestamptz not null default now()
);
create index if not exists grades_ue_id_idx on public.grades (ue_id);
create index if not exists grades_user_id_idx on public.grades (user_id);

-- 4. updated_at auto sur formations -----------------------------------
drop trigger if exists formations_set_updated_at on public.formations;
create trigger formations_set_updated_at
  before update on public.formations
  for each row execute function public.set_updated_at();

-- 5. RLS : chacun ne voit/gère que ses propres données ----------------
alter table public.formations enable row level security;
alter table public.ues        enable row level security;
alter table public.grades     enable row level security;

-- Formations
drop policy if exists "formations_all_own" on public.formations;
create policy "formations_all_own" on public.formations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- UE
drop policy if exists "ues_all_own" on public.ues;
create policy "ues_all_own" on public.ues
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notes
drop policy if exists "grades_all_own" on public.grades;
create policy "grades_all_own" on public.grades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
