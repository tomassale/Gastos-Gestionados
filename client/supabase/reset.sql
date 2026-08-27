-- Deja la base como si nunca se hubiera corrido nada de esta app.
--
-- CUIDADO: borra los hogares con todos sus gastos y personas. Solo sirve para
-- empezar de cero o para rehacer el esquema cuando cambia una firma y
-- `create or replace` no alcanza.
--
-- Después de correr esto, correr `schema.sql`.

drop function if exists push_changes(text, json, json);
drop function if exists pull_changes(text, timestamptz);
drop function if exists check_household(text);
drop function if exists create_household(text, text);
drop function if exists household_for_code(text);

drop table if exists expenses;
drop table if exists people;
drop table if exists households;
