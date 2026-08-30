-- SquadSync — schéma Supabase
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  slots jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (team_id, name)
);

create table if not exists coach_settings (
  id int primary key default 1,
  busy_slots jsonb not null default '[]',
  min_players int not null default 3
);

create table if not exists coach_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  note text
);

-- Seed des deux équipes (modifie/ajoute des lignes ici si besoin)
insert into teams (slug, name) values
  ('pax', 'Pax Horizon'),
  ('pepsonnet', 'Pepsonnet')
on conflict (slug) do nothing;

insert into coach_settings (id) values (1) on conflict (id) do nothing;

-- Row Level Security : lecture/écriture ouvertes à la clé "anon" publique.
-- C'est volontairement simple (pas de compte pour les joueurs) : le lien
-- de chaque équipe fait office de "mot de passe" léger. Le dashboard /
-- les réglages sont protégés côté appli par un code (VITE_COACH_PIN),
-- pas par ces règles.
alter table teams enable row level security;
alter table players enable row level security;
alter table coach_settings enable row level security;
alter table coach_exceptions enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "public read players" on players for select using (true);
create policy "public write players" on players for insert with check (true);
create policy "public update players" on players for update using (true);
create policy "public delete players" on players for delete using (true);
create policy "public read coach_settings" on coach_settings for select using (true);
create policy "public write coach_settings" on coach_settings for insert with check (true);
create policy "public update coach_settings" on coach_settings for update using (true);
create policy "public read coach_exceptions" on coach_exceptions for select using (true);
create policy "public write coach_exceptions" on coach_exceptions for insert with check (true);
create policy "public delete coach_exceptions" on coach_exceptions for delete using (true);
