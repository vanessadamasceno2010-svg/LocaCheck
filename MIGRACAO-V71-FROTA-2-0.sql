-- LocaCheck V71 / Etapa 9 — Frota 2.0
-- Execute uma única vez no Supabase SQL Editor antes de usar os novos campos.

alter table public.rental_site_motorcycles
  add column if not exists model_year integer,
  add column if not exists engine_cc integer,
  add column if not exists deposit numeric(12,2) not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rental_site_motorcycles_model_year_check') then
    alter table public.rental_site_motorcycles add constraint rental_site_motorcycles_model_year_check check (model_year is null or model_year between 1980 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rental_site_motorcycles_engine_cc_check') then
    alter table public.rental_site_motorcycles add constraint rental_site_motorcycles_engine_cc_check check (engine_cc is null or engine_cc >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rental_site_motorcycles_deposit_check') then
    alter table public.rental_site_motorcycles add constraint rental_site_motorcycles_deposit_check check (deposit >= 0);
  end if;
end $$;
