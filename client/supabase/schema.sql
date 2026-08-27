-- Gastos gestionados — esquema y API de sincronización.
--
-- Modelo de acceso: un "hogar" identificado por un código secreto que eligen
-- las personas que lo comparten. Las tablas quedan cerradas: la anon key de
-- Supabase no alcanza para leer ni escribir nada. Todo pasa por funciones
-- SECURITY DEFINER que validan el código en cada llamada.
--
-- Correr entero en el SQL Editor de Supabase.

-- En Supabase pgcrypto suele vivir en el esquema `extensions`.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tablas ---

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists people (
  id text primary key,
  household_id uuid not null references households (id) on delete cascade,
  name text not null,
  -- Baja lógica: hay que propagar el borrado a los otros dispositivos.
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  household_id uuid not null references households (id) on delete cascade,
  date date not null,
  concept text not null,
  amount numeric(14, 2) not null,
  category text,
  person_ids text[] not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists people_household_updated_idx
  on people (household_id, updated_at);
create index if not exists expenses_household_updated_idx
  on expenses (household_id, updated_at);

-- ------------------------------------------------------------------ rls ---
-- Sin políticas: nadie llega a las tablas con la anon key. El acceso es por
-- las funciones de más abajo, que corren como dueñas y validan el código.

alter table households enable row level security;
alter table people enable row level security;
alter table expenses enable row level security;

-- ------------------------------------------------------------ funciones ---

/**
 * Devuelve el hogar al que corresponde un código, o error si no coincide.
 * Interna: no se expone a la app.
 */
create or replace function household_for_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_code is null or length(trim(p_code)) < 8 then
    raise exception 'Código inválido';
  end if;

  select id into v_id
  from households
  where code_hash = crypt(p_code, code_hash)
  limit 1;

  if v_id is null then
    raise exception 'No hay ningún hogar con ese código';
  end if;

  return v_id;
end;
$$;

revoke all on function household_for_code(text) from public, anon, authenticated;

/** Crea un hogar nuevo con su código. Devuelve el identificador. */
create or replace function create_household(p_name text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_code is null or length(trim(p_code)) < 8 then
    raise exception 'El código tiene que tener al menos 8 caracteres';
  end if;

  if exists (select 1 from households where code_hash = crypt(p_code, code_hash)) then
    raise exception 'Ese código ya está en uso';
  end if;

  insert into households (name, code_hash)
  values (coalesce(nullif(trim(p_name), ''), 'Mi hogar'), crypt(p_code, gen_salt('bf')))
  returning id into v_id;

  return v_id;
end;
$$;

/** Confirma que el código existe, para la pantalla de ingreso. */
create or replace function check_household(p_code text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  -- Se resuelve acá y no dentro del WHERE: si quedara en la consulta, con la
  -- tabla vacía Postgres no llegaría a ejecutarlo y no validaría nada.
  v_id uuid := household_for_code(p_code);
  v_name text;
begin
  select name into v_name from households where id = v_id;
  return v_name;
end;
$$;

/**
 * Todo lo que cambió desde `p_since`. La app manda la última marca que recibió
 * y recibe solo las novedades, incluidas las bajas.
 */
create or replace function pull_changes(p_code text, p_since timestamptz default null)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_household uuid := household_for_code(p_code);
  v_since timestamptz := coalesce(p_since, 'epoch'::timestamptz);
begin
  return json_build_object(
    'server_time', now(),
    'people', coalesce((
      select json_agg(row_to_json(p))
      from (
        select id, name, deleted, updated_at
        from people
        where household_id = v_household and updated_at > v_since
        order by updated_at
      ) p
    ), '[]'::json),
    'expenses', coalesce((
      select json_agg(row_to_json(e))
      from (
        select id, date, concept, amount, category, person_ids, deleted, updated_at
        from expenses
        where household_id = v_household and updated_at > v_since
        order by updated_at
      ) e
    ), '[]'::json)
  );
end;
$$;

/**
 * Cuánto tiempo se guarda un gasto antes de borrarse solo, contado por la
 * fecha del gasto. Pasado el plazo desaparece de la base y del dispositivo,
 * sin vuelta atrás. Tiene que coincidir con `RETENTION_YEARS` en la app.
 */
create or replace function retention_period()
returns interval
language sql
immutable
as $$ select interval '2 years' $$;

/**
 * Cuánto se conserva la marca de un registro borrado. Tiene que ser mayor que
 * lo que un dispositivo puede estar sin abrir la app: si se olvida antes de que
 * se entere, el registro le reaparece al sincronizar. Igual que en la app.
 */
create or replace function tombstone_ttl()
returns interval
language sql
immutable
as $$ select interval '90 days' $$;

/**
 * Sube los cambios locales. Gana la última escritura: si el registro que llega
 * es más viejo que el guardado, se descarta. De paso olvida las marcas de
 * borrado que ya cumplieron su plazo, para que la tabla no crezca sin techo.
 */
create or replace function push_changes(
  p_code text,
  p_people json default '[]',
  p_expenses json default '[]'
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_household uuid := household_for_code(p_code);
begin
  insert into people (id, household_id, name, deleted, updated_at)
  select
    x.id,
    v_household,
    x.name,
    coalesce(x.deleted, false),
    coalesce(x.updated_at, now())
  from json_to_recordset(p_people)
    as x (id text, name text, deleted boolean, updated_at timestamptz)
  on conflict (id) do update
    set name = excluded.name,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    where people.household_id = v_household
      and excluded.updated_at >= people.updated_at;

  insert into expenses (
    id, household_id, date, concept, amount, category, person_ids, deleted, updated_at
  )
  select
    x.id,
    v_household,
    x.date,
    x.concept,
    x.amount,
    nullif(x.category, ''),
    coalesce(x.person_ids, '{}'),
    coalesce(x.deleted, false),
    coalesce(x.updated_at, now())
  from json_to_recordset(p_expenses)
    as x (
      id text, date date, concept text, amount numeric, category text,
      person_ids text[], deleted boolean, updated_at timestamptz
    )
  on conflict (id) do update
    set date = excluded.date,
        concept = excluded.concept,
        amount = excluded.amount,
        category = excluded.category,
        person_ids = excluded.person_ids,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    where expenses.household_id = v_household
      and excluded.updated_at >= expenses.updated_at;

  -- Gastos que ya cumplieron el plazo de guarda.
  delete from expenses
  where household_id = v_household
    and date < (current_date - retention_period());

  delete from expenses
  where household_id = v_household
    and deleted
    and updated_at < now() - tombstone_ttl();

  delete from people
  where household_id = v_household
    and deleted
    and updated_at < now() - tombstone_ttl();

  return json_build_object('server_time', now());
end;
$$;

-- La app solo puede llamar a estas cuatro.
grant execute on function create_household(text, text) to anon;
grant execute on function check_household(text) to anon;
grant execute on function pull_changes(text, timestamptz) to anon;
grant execute on function push_changes(text, json, json) to anon;
