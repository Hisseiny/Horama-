-- Horama schema v1 (frozen with contrats-v1). Mirrors contrats/types.ts.
-- Writes: service role key only (server side, local). Reads: public (jury read-only app).

create table if not exists passages (
  id text primary key,
  logiciel text not null,
  version_testee text not null,
  version_reference text not null,
  etat text not null check (etat in ('en_cours','joue','verifie','echec')),
  debut timestamptz not null default now(),
  fin timestamptz,
  duree_s numeric,
  cout_usd numeric,
  rapport jsonb            -- RapportPassage, written by @horama/agent when every session is terminal
);

create table if not exists evenements (
  id bigint generated always as identity primary key,
  passage_id text not null references passages(id) on delete cascade,
  test_id text not null,
  session_id text not null,
  horodatage timestamptz not null,
  etape int not null,
  action text not null,
  capture_url text,
  etat_session text not null
);
create index if not exists evenements_passage_idx on evenements (passage_id, horodatage);

create table if not exists captures (
  id bigint generated always as identity primary key,
  passage_id text not null references passages(id) on delete cascade,
  test_id text not null,
  session_id text not null,
  ecran text not null,
  vue text not null default 'defaut',
  version text not null,
  chemin text not null,
  url text not null,
  largeur int not null,
  hauteur int not null,
  defilement int[] not null default '{0,0}',
  texte_page text not null default '',
  url_page text not null default '',
  etape int not null,
  prise_le timestamptz not null default now()
);
create unique index if not exists captures_unique_idx on captures (passage_id, test_id, ecran, vue); -- relever may run more than once: upsert

create table if not exists references_ecran (
  logiciel text not null,
  ecran text not null,
  vue text not null default 'defaut',
  version text not null,
  capture_url text not null,
  chemin_vault text not null,     -- vault-horama/<logiciel>/references/<ecran>/<vue>--v<version>.png
  validee_le timestamptz not null default now(),   -- changed only by the explicit "validate as reference" action (F32)
  primary key (logiciel, ecran, vue)
);

create table if not exists resultats (
  id bigint generated always as identity primary key,
  passage_id text not null references passages(id) on delete cascade,
  test_id text not null,
  statut text not null check (statut in ('PASS','SUSPECTED','VERIFIED_FAIL','INCONCLUSIVE')),
  payload jsonb not null,          -- ResultatVerification
  cree_le timestamptz not null default now()
);

create table if not exists decisions (
  id text primary key,
  passage_id text not null,
  payload jsonb not null,          -- Decision
  cree_le timestamptz not null default now()
);

create table if not exists mesures (
  id bigint generated always as identity primary key,
  payload jsonb not null,          -- LigneMesure
  cree_le timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['passages','evenements','captures','references_ecran','resultats','decisions','mesures'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists lecture_publique on %I', t);
    execute format('create policy lecture_publique on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public) values ('captures', 'captures', true)
on conflict (id) do nothing;
