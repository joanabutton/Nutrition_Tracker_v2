alter type public.external_food_source add value if not exists 'portfir_bdca';
alter type public.external_food_source add value if not exists 'cofid_uk';

create table if not exists public.reference_foods (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_food_id text not null,
  source_version text not null,
  name text not null,
  normalized_name text not null,
  brand text,
  category text,
  locale text,
  serving_quantity numeric(10, 3) not null default 100,
  serving_unit text not null default 'g',
  calories numeric(10, 2) not null,
  protein_g numeric(10, 2) not null default 0,
  carbohydrate_g numeric(10, 2) not null default 0,
  fat_g numeric(10, 2) not null default 0,
  saturated_fat_g numeric(10, 2),
  fibre_g numeric(10, 2),
  total_sugars_g numeric(10, 2),
  added_sugar_g numeric(10, 2),
  salt_g numeric(10, 2),
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_version, source_food_id)
);

create index if not exists reference_foods_source_idx
on public.reference_foods(source);

create index if not exists reference_foods_normalized_name_idx
on public.reference_foods(normalized_name);

create trigger reference_foods_set_updated_at
before update on public.reference_foods
for each row execute function public.set_updated_at();

alter table public.reference_foods enable row level security;

create policy "Authenticated users can read reference foods"
on public.reference_foods
for select
to authenticated
using (true);
