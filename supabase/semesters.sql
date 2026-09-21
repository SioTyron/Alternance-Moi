-- =====================================================================
-- alternance-et-moi — Ajout des SEMESTRES au module Note Tracker
-- À exécuter dans le SQL Editor du projet Supabase.
-- Une formation (année) contient plusieurs semestres ; chaque UE
-- appartient à un semestre. Rétro-remplit les données existantes.
-- =====================================================================

-- 1. TABLE semesters ---------------------------------------------------
create table if not exists public.semesters (
  id            uuid primary key default gen_random_uuid(),
  formation_id  uuid not null references public.formations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  position      int not null default 1,
  created_at    timestamptz not null default now()
);
create index if not exists semesters_formation_id_idx on public.semesters (formation_id);
create index if not exists semesters_user_id_idx on public.semesters (user_id);

alter table public.semesters enable row level security;
drop policy if exists "semesters_all_own" on public.semesters;
create policy "semesters_all_own" on public.semesters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Rattacher les UE à un semestre ------------------------------------
alter table public.ues
  add column if not exists semester_id uuid references public.semesters(id) on delete cascade;
create index if not exists ues_semester_id_idx on public.ues (semester_id);

-- 3. Rétro-remplissage : un "Semestre 1" par formation, UE existantes
--    rattachées à ce semestre.
do $$
declare
  f record;
  sem_id uuid;
begin
  for f in select id, user_id from public.formations loop
    if not exists (select 1 from public.semesters s where s.formation_id = f.id) then
      insert into public.semesters (formation_id, user_id, name, position)
      values (f.id, f.user_id, 'Semestre 1', 1)
      returning id into sem_id;

      update public.ues
        set semester_id = sem_id
        where formation_id = f.id and semester_id is null;
    end if;
  end loop;
end $$;
