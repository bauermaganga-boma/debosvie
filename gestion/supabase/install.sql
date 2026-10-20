-- Debos Vie — base du back-office (schéma « debosvie »)
-- Exécuter une seule fois. Ne contient AUCUN mot de passe : le compte admin est créé à part.
create extension if not exists pgcrypto;
create schema if not exists debosvie;

-- Tables : une ligne = un document JSON (souple, évolutif)
create table if not exists debosvie.admins   (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists debosvie.settings (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
do $$
declare t text;
begin
  foreach t in array array['requests','clients','quotes','invoices','contracts','projects'] loop
    execute format('create table if not exists debosvie.%I (
      id uuid primary key default gen_random_uuid(),
      data jsonb not null default ''{}''::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now())', t);
    execute format('alter table debosvie.%I enable row level security', t);
  end loop;
end $$;
alter table debosvie.admins enable row level security;
alter table debosvie.settings enable row level security;

-- Qui est administrateur ?
create or replace function debosvie.is_admin() returns boolean
language sql stable security definer set search_path = debosvie, public as
$$ select exists (select 1 from debosvie.admins where user_id = auth.uid()) $$;
revoke all on function debosvie.is_admin() from public;
grant execute on function debosvie.is_admin() to anon, authenticated;

-- Règles : l'administrateur gère tout
do $$
declare t text;
begin
  foreach t in array array['requests','clients','quotes','invoices','contracts','projects','settings'] loop
    execute format('drop policy if exists admin_all on debosvie.%I', t);
    execute format('create policy admin_all on debosvie.%I for all to authenticated using (debosvie.is_admin()) with check (debosvie.is_admin())', t);
  end loop;
end $$;
drop policy if exists admin_read on debosvie.admins;
create policy admin_read on debosvie.admins for select to authenticated using (user_id = auth.uid());

-- Le public peut SEULEMENT déposer une demande (jamais lire)
drop policy if exists public_insert on debosvie.requests;
create policy public_insert on debosvie.requests for insert to anon, authenticated
  with check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 6000);

-- Nettoyage de ce qu'envoie le public : champs connus uniquement, longueurs limitées, statut imposé
create or replace function debosvie.clean_request() returns trigger
language plpgsql security definer set search_path = debosvie, public as $$
begin
  if auth.role() = 'authenticated' and debosvie.is_admin() then return new; end if;
  new.data := jsonb_build_object(
    'nom',        left(coalesce(new.data->>'nom',''), 120),
    'societe',    left(coalesce(new.data->>'societe',''), 160),
    'email',      left(coalesce(new.data->>'email',''), 160),
    'telephone',  left(coalesce(new.data->>'telephone',''), 40),
    'pack',       left(coalesce(new.data->>'pack',''), 60),
    'plateforme', left(coalesce(new.data->>'plateforme',''), 60),
    'message',    left(coalesce(new.data->>'message',''), 3000),
    'lang',       left(coalesce(new.data->>'lang','fr'), 5),
    'statut',     'nouvelle',
    'source',     'site');
  if length(trim(new.data->>'nom')) < 2 or length(trim(new.data->>'message')) < 3
     or position('@' in coalesce(new.data->>'email','')) < 2 then
    raise exception 'Demande incomplète';
  end if;
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_clean_request on debosvie.requests;
create trigger trg_clean_request before insert on debosvie.requests for each row execute function debosvie.clean_request();

-- Horodatage des modifications
create or replace function debosvie.touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['requests','clients','quotes','invoices','contracts','projects','settings'] loop
    execute format('drop trigger if exists trg_touch on debosvie.%I', t);
    execute format('create trigger trg_touch before update on debosvie.%I for each row execute function debosvie.touch()', t);
  end loop;
end $$;

-- Droits d'accès à l'API
grant usage on schema debosvie to anon, authenticated;
grant insert on debosvie.requests to anon;
grant select, insert, update, delete on all tables in schema debosvie to authenticated;
revoke all on debosvie.admins from anon;
grant select on debosvie.admins to authenticated;
