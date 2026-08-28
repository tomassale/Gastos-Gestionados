-- Gastos gestionados — esquema y API de sincronización.
--
-- Modelo de acceso: un "hogar" identificado por un código secreto que comparten
-- quienes lo usan. Las tablas quedan cerradas: la anon key de Supabase no
-- alcanza para leer ni escribir nada. Todo pasa por funciones SECURITY DEFINER
-- que validan el código en cada llamada.
--
-- El código lo genera la app con 80 bits de azar (`lib/household-code.ts`): es
-- lo único que protege los datos, así que no puede quedar librado a que alguien
-- elija "lacasa2024". Acá abajo están las otras dos defensas que ese modelo
-- necesita: verificación con bcrypt y freno por intentos fallidos.
--
-- Correr entero en el SQL Editor de Supabase. Es idempotente: se puede volver a
-- correr sobre una base ya creada y migra lo que haga falta.

-- En Supabase pgcrypto suele vivir en el esquema `extensions`.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tablas ---

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_hash text not null,
  created_at timestamptz not null default now()
);

-- Clave de búsqueda determinística del código. Sin esto hay que probar bcrypt
-- contra cada fila de la tabla en cada llamada, y `pull_changes` se llama 180
-- veces por hora por dispositivo. Ver `code_lookup_for`.
alter table households add column if not exists code_lookup text;

/*
 * El identificador de una persona o de un gasto lo elige el dispositivo y solo
 * es único dentro del hogar: `personIdFor('Ana')` da `persona-ana` en todos los
 * dispositivos, que es justo lo que se busca puertas adentro. Por eso el hogar
 * forma parte de la clave: con `id` solo, la segunda Ana de la aplicación
 * chocaría contra la primera y no se guardaría nunca, sin dar error.
 */
create table if not exists people (
  id text not null,
  household_id uuid not null references households (id) on delete cascade,
  name text not null,
  -- Baja lógica: hay que propagar el borrado a los otros dispositivos.
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

create table if not exists expenses (
  id text not null,
  household_id uuid not null references households (id) on delete cascade,
  date date not null,
  concept text not null,
  amount numeric(14, 2) not null,
  category text,
  person_ids text[] not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

/*
 * Bases creadas antes de que el hogar entrara en la clave. Se migran acá y no
 * en un script aparte para que correr este archivo alcance siempre.
 */
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'people'::regclass and contype = 'p' and array_length(conkey, 1) = 1
  ) then
    alter table people drop constraint people_pkey;
    alter table people add primary key (household_id, id);
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'expenses'::regclass and contype = 'p' and array_length(conkey, 1) = 1
  ) then
    alter table expenses drop constraint expenses_pkey;
    alter table expenses add primary key (household_id, id);
  end if;
end $$;

/*
 * Topes de tamaño. La anon key es pública, así que cualquiera puede crear un
 * hogar propio y empujar por la API lo que quiera: sin estos límites, una sola
 * llamada llena los 500 MB del plan gratuito. `amount > 0` además replica del
 * lado del servidor lo que la app ya valida al cargar un gasto.
 */
do $$
begin
  alter table households add constraint households_name_len check (char_length(name) <= 80);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table people add constraint people_id_len check (char_length(id) <= 64);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table people add constraint people_name_len check (char_length(name) <= 120);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table expenses add constraint expenses_id_len check (char_length(id) <= 64);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table expenses add constraint expenses_concept_len check (char_length(concept) <= 200);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table expenses add constraint expenses_category_len
    check (category is null or char_length(category) <= 60);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table expenses add constraint expenses_amount_range
    check (amount > 0 and amount < 1e12);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table expenses add constraint expenses_payers
    check (coalesce(array_length(person_ids, 1), 0) <= 20);
exception when duplicate_object then null;
end $$;

/*
 * Secretos del servidor. Vive en su propia tabla, cerrada como el resto, para
 * que la pimienta de `code_lookup_for` no salga nunca de la base.
 */
create table if not exists app_secrets (
  k text primary key,
  v text not null
);

insert into app_secrets (k, v)
values ('code_pepper', encode(gen_random_bytes(32), 'hex'))
on conflict (k) do nothing;

/*
 * Intentos fallidos de acertar un código, por origen. Es el freno contra la
 * fuerza bruta: el código es lo único que protege los datos y el endpoint de
 * Supabase es público, así que sin esto se puede probar sin límite.
 */
create table if not exists code_attempts (
  client text primary key,
  failures int not null default 0,
  window_start timestamptz not null default now()
);

create unique index if not exists households_code_lookup_idx
  on households (code_lookup);

-- Parcial: una vez migrados los hogares heredados queda vacío y no cuesta nada.
create index if not exists households_code_lookup_null_idx
  on households (id) where code_lookup is null;

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
alter table app_secrets enable row level security;
alter table code_attempts enable row level security;

-- ------------------------------------------------------------ funciones ---

/**
 * Clave de búsqueda del código: HMAC con una pimienta que solo conoce la base.
 * A diferencia del bcrypt de `code_hash`, que lleva salt propio y por eso no se
 * puede indexar, esta sí es determinística y entra en un índice único.
 *
 * Quien consiguiera volcar `households` vería qué filas comparten código, pero
 * sin la pimienta —que está en una tabla igual de cerrada— no puede probar
 * diccionarios contra ella. Y quien decide si el código es correcto sigue
 * siendo bcrypt: esto solo evita el recorrido de toda la tabla.
 */
create or replace function code_lookup_for(p_code text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(hmac(p_code, (select v from app_secrets where k = 'code_pepper'), 'sha256'), 'hex')
$$;

revoke all on function code_lookup_for(text) from public, anon, authenticated;

/**
 * De dónde viene la llamada, para contar intentos fallidos. PostgREST expone
 * las cabeceras del request; `cf-connecting-ip` es la que pone la infraestructura
 * y el cliente no puede falsear, a diferencia de `x-forwarded-for`.
 *
 * Devuelve null si no hay ninguna: ahí no se frena a nadie. Es preferible no
 * limitar a limitar de más y dejar afuera a quien sí sabe el código, porque
 * sin cabecera todos los clientes caerían en la misma cuenta.
 */
create or replace function client_ip()
returns text
language sql
stable
set search_path = public, extensions
as $$
  select nullif(
    coalesce(
      current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
      current_setting('request.headers', true)::json ->> 'x-real-ip',
      split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)
    ),
    ''
  )
$$;

revoke all on function client_ip() from public, anon, authenticated;

/**
 * Cuántos intentos fallidos lleva este origen en la ventana vigente. Una ventana
 * vencida cuenta como cero: el freno se suelta solo.
 */
create or replace function failed_attempts(p_key text, p_window interval)
returns int
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select failures from code_attempts
     where client = p_key and window_start > now() - p_window),
    0
  )
$$;

revoke all on function failed_attempts(text, interval) from public, anon, authenticated;

create or replace function record_attempt(p_key text, p_window interval)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into code_attempts (client, failures, window_start)
  values (p_key, 1, now())
  on conflict (client) do update
    set failures = case
          when code_attempts.window_start < now() - p_window then 1
          else code_attempts.failures + 1
        end,
        window_start = case
          when code_attempts.window_start < now() - p_window then now()
          else code_attempts.window_start
        end;
end;
$$;

revoke all on function record_attempt(text, interval) from public, anon, authenticated;

/** Cuántos fallos se toleran antes de frenar, y por cuánto tiempo se cuentan. */
create or replace function max_failures() returns int
language sql immutable as $$ select 15 $$;

create or replace function attempt_window() returns interval
language sql immutable as $$ select interval '15 minutes' $$;

/**
 * Devuelve el hogar al que corresponde un código, o error si no coincide.
 * Interna: no se expone a la app.
 *
 * Es el único lugar donde se valida el código, a propósito: si el freno por
 * intentos viviera en `check_household`, la fuerza bruta se haría llamando a
 * `pull_changes`, que valida exactamente lo mismo.
 */
create or replace function household_for_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_client text := client_ip();
begin
  if p_code is null or length(trim(p_code)) < 8 then
    raise exception 'Código inválido';
  end if;

  if v_client is not null
     and failed_attempts(v_client, attempt_window()) >= max_failures() then
    raise exception 'Demasiados intentos. Probá de nuevo en un rato.';
  end if;

  -- Una sonda al índice y un solo bcrypt, sin importar cuántos hogares haya.
  select id into v_id
  from households
  where code_lookup = code_lookup_for(p_code)
    and code_hash = crypt(p_code, code_hash)
  limit 1;

  -- Hogares creados antes de que existiera la columna de búsqueda: el código no
  -- se puede derivar del hash, así que se resuelven una última vez recorriendo
  -- lo que quedó sin migrar y se marcan al pasar.
  if v_id is null then
    select id into v_id
    from households
    where code_lookup is null and code_hash = crypt(p_code, code_hash)
    limit 1;

    if v_id is not null then
      update households set code_lookup = code_lookup_for(p_code) where id = v_id;
    end if;
  end if;

  if v_id is null then
    if v_client is not null then
      perform record_attempt(v_client, attempt_window());
    end if;
    raise exception 'No hay ningún hogar con ese código';
  end if;

  if v_client is not null then
    delete from code_attempts where client = v_client;
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
  v_client text := client_ip();
  v_key text := 'crear:' || coalesce(v_client, '');
begin
  if p_code is null or length(trim(p_code)) < 16 then
    raise exception 'El código tiene que tener al menos 16 caracteres';
  end if;

  -- Crear hogares es gratis y no pide nada: sin freno, se llena la base.
  if v_client is not null and failed_attempts(v_key, interval '1 hour') >= 5 then
    raise exception 'Se crearon demasiados hogares desde acá. Probá de nuevo en un rato.';
  end if;

  begin
    insert into households (name, code_hash, code_lookup)
    values (
      coalesce(nullif(trim(p_name), ''), 'Mi hogar'),
      -- Cost 12: el 6 que trae `gen_salt('bf')` por defecto son ~2 ms, nada
      -- frente a un ataque offline si alguna vez se filtra la tabla.
      crypt(p_code, gen_salt('bf', 12)),
      code_lookup_for(p_code)
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ese código ya está en uso';
  end;

  if v_client is not null then
    perform record_attempt(v_key, interval '1 hour');
  end if;

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
  -- Un dispositivo real nunca sube tanto de una vez.
  if json_array_length(p_people) > 500 or json_array_length(p_expenses) > 2000 then
    raise exception 'Demasiados registros en una sola sincronización';
  end if;

  insert into people (id, household_id, name, deleted, updated_at)
  select
    x.id,
    v_household,
    x.name,
    coalesce(x.deleted, false),
    coalesce(x.updated_at, now())
  from json_to_recordset(p_people)
    as x (id text, name text, deleted boolean, updated_at timestamptz)
  on conflict (household_id, id) do update
    set name = excluded.name,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    -- Estricto: con la misma marca no hay nada que cambiar, y reescribir la
    -- fila solo deja una tupla muerta que después hay que aspirar.
    where excluded.updated_at > people.updated_at;

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
  on conflict (household_id, id) do update
    set date = excluded.date,
        concept = excluded.concept,
        amount = excluded.amount,
        category = excluded.category,
        person_ids = excluded.person_ids,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    where excluded.updated_at > expenses.updated_at;

  -- La limpieza no necesita correr en cada push: lo que busca cambia una vez
  -- por día como mucho. Una de cada veinte alcanza para que nada se acumule.
  if random() < 0.05 then
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
  end if;

  return json_build_object('server_time', now());
end;
$$;

/**
 * Ping para que el proyecto no se duerma. El plan gratuito de Supabase pausa la
 * base tras una semana sin actividad, y hay que despausarla a mano desde el
 * panel; la llama una tarea programada todos los días
 * (`.github/workflows/supabase-keepalive.yml`).
 *
 * Lee `households` a propósito: así la actividad llega a Postgres y no se queda
 * en el borde. No devuelve nada del contenido, solo la hora del servidor, así
 * que no le sirve a nadie más que al reloj.
 */
create or replace function heartbeat()
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ignored bigint;
begin
  select count(*) into v_ignored from households;
  return now();
end;
$$;

-- La app solo puede llamar a estas cuatro (`heartbeat` no lo usa la app, sino
-- la tarea programada, con la misma anon key). El `revoke` no es decorativo:
-- PostgreSQL le da EXECUTE a PUBLIC a toda función recién creada, así que sin
-- esto quedarían abiertas a cualquier rol que se agregue más adelante.
revoke all on function create_household(text, text) from public;
revoke all on function check_household(text) from public;
revoke all on function pull_changes(text, timestamptz) from public;
revoke all on function push_changes(text, json, json) from public;
revoke all on function heartbeat() from public;

grant execute on function create_household(text, text) to anon;
grant execute on function check_household(text) to anon;
grant execute on function pull_changes(text, timestamptz) to anon;
grant execute on function push_changes(text, json, json) to anon;
grant execute on function heartbeat() to anon;
