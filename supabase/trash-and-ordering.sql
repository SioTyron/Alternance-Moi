-- =====================================================================
-- alternance-et-moi — Corbeille (soft-delete) + réordonnancement des UE
-- À exécuter dans le SQL Editor du projet Supabase (une seule fois).
-- =====================================================================

-- 1. CORBEILLE : colonne deleted_at (NULL = actif, sinon = dans la corbeille)
alter table public.reports    add column if not exists deleted_at timestamptz;
alter table public.formations add column if not exists deleted_at timestamptz;
alter table public.semesters  add column if not exists deleted_at timestamptz;
alter table public.ues        add column if not exists deleted_at timestamptz;

create index if not exists reports_deleted_at_idx    on public.reports (deleted_at);
create index if not exists formations_deleted_at_idx on public.formations (deleted_at);
create index if not exists semesters_deleted_at_idx  on public.semesters (deleted_at);
create index if not exists ues_deleted_at_idx        on public.ues (deleted_at);

-- 2. RÉORDONNANCEMENT : position des UE dans leur semestre
alter table public.ues add column if not exists position int not null default 0;

-- Rétro-remplissage : numérote les UE existantes par semestre (ordre de création)
with ranked as (
  select id, row_number() over (partition by semester_id order by created_at) as rn
  from public.ues
)
update public.ues u
  set position = r.rn
  from ranked r
  where u.id = r.id;

create index if not exists ues_position_idx on public.ues (semester_id, position);
