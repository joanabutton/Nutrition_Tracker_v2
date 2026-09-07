create extension if not exists pg_trgm;

create index if not exists foods_name_ilike_trgm_idx
on public.foods using gin (name gin_trgm_ops);

create index if not exists foods_brand_ilike_trgm_idx
on public.foods using gin (brand gin_trgm_ops)
where brand is not null;

create index if not exists reference_foods_normalized_name_trgm_idx
on public.reference_foods using gin (normalized_name gin_trgm_ops);
