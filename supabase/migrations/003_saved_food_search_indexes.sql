create extension if not exists pg_trgm;

create index if not exists foods_name_trgm_idx
on public.foods using gin (lower(name) gin_trgm_ops);

create index if not exists foods_brand_trgm_idx
on public.foods using gin (lower(brand) gin_trgm_ops)
where brand is not null;
