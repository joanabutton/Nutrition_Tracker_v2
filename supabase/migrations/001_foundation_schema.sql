create extension if not exists "pgcrypto";

create type public.sex as enum ('female', 'male');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type public.nutrition_goal as enum ('lose_weight', 'maintain_weight', 'gain_weight');
create type public.nutrition_source as enum ('verified', 'calculated', 'estimated', 'user_provided');
create type public.external_food_source as enum ('usda_fooddata_central', 'open_food_facts');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  birth_date date,
  sex public.sex,
  height_cm numeric(5, 2),
  current_weight_kg numeric(5, 2),
  activity_level public.activity_level,
  goal public.nutrition_goal,
  desired_weight_change_kg_per_week numeric(4, 2) check (
    desired_weight_change_kg_per_week is null
    or desired_weight_change_kg_per_week between 0 and 1.5
  ),
  calorie_target integer,
  protein_target_g numeric(6, 2),
  carbohydrate_target_g numeric(6, 2),
  fat_target_g numeric(6, 2),
  saturated_fat_limit_g numeric(6, 2),
  fibre_target_g numeric(6, 2),
  added_sugar_limit_g numeric(6, 2),
  exercise_eat_back_percentage integer not null default 50 check (exercise_eat_back_percentage in (0, 50, 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  aliases text[] not null default '{}',
  source public.nutrition_source not null,
  external_source public.external_food_source,
  external_source_id text,
  serving_quantity numeric(10, 3) not null,
  serving_unit text not null,
  calories numeric(10, 2) not null,
  protein_g numeric(10, 2) not null default 0,
  carbohydrate_g numeric(10, 2) not null default 0,
  fat_g numeric(10, 2) not null default 0,
  saturated_fat_g numeric(10, 2) not null default 0,
  fibre_g numeric(10, 2) not null default 0,
  total_sugars_g numeric(10, 2),
  added_sugar_g numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type public.meal_type not null,
  food_id uuid references public.foods(id) on delete set null,
  display_name text not null,
  quantity numeric(10, 3) not null,
  unit text not null,
  calories numeric(10, 2) not null,
  protein_g numeric(10, 2) not null default 0,
  carbohydrate_g numeric(10, 2) not null default 0,
  fat_g numeric(10, 2) not null default 0,
  saturated_fat_g numeric(10, 2) not null default 0,
  fibre_g numeric(10, 2) not null default 0,
  added_sugar_g numeric(10, 2),
  nutrition_source public.nutrition_source not null,
  original_user_text text,
  created_at timestamptz not null default now()
);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.saved_meals(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity numeric(10, 3) not null,
  unit text not null
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  type text not null,
  duration_minutes numeric(10, 2),
  distance_km numeric(10, 3),
  calories_estimated numeric(10, 2) not null,
  estimation_method text not null,
  original_user_text text,
  created_at timestamptz not null default now()
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  weight_kg numeric(5, 2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index foods_user_id_idx on public.foods(user_id);
create index foods_name_idx on public.foods using gin (to_tsvector('english', name));
create index food_logs_user_logged_at_idx on public.food_logs(user_id, logged_at desc);
create index saved_meals_user_id_idx on public.saved_meals(user_id);
create index exercise_logs_user_logged_at_idx on public.exercise_logs(user_id, logged_at desc);
create index weight_logs_user_logged_at_idx on public.weight_logs(user_id, logged_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger foods_set_updated_at
before update on public.foods
for each row execute function public.set_updated_at();

create trigger saved_meals_set_updated_at
before update on public.saved_meals
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.weight_logs enable row level security;

create policy "Users can manage their profile"
on public.profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read shared and own foods"
on public.foods
for select
using (user_id is null or auth.uid() = user_id);

create policy "Users can manage own foods"
on public.foods
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own food logs"
on public.food_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own saved meals"
on public.saved_meals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own saved meal items"
on public.saved_meal_items
for all
using (
  exists (
    select 1
    from public.saved_meals
    where saved_meals.id = saved_meal_items.saved_meal_id
      and saved_meals.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.foods
    where foods.id = saved_meal_items.food_id
      and (foods.user_id is null or foods.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.saved_meals
    where saved_meals.id = saved_meal_items.saved_meal_id
      and saved_meals.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.foods
    where foods.id = saved_meal_items.food_id
      and (foods.user_id is null or foods.user_id = auth.uid())
  )
);

create policy "Users can manage own exercise logs"
on public.exercise_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own weight logs"
on public.weight_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
