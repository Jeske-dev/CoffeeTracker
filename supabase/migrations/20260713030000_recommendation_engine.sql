alter table public.equipment
  add column if not exists grind_scale_type text check (grind_scale_type in ('stepped', 'stepless')),
  add column if not exists minimum_setting numeric,
  add column if not exists maximum_setting numeric,
  add column if not exists micro_step numeric check (micro_step > 0),
  add column if not exists finer_direction text check (finer_direction in ('higher', 'lower')),
  add column if not exists clicks_per_rotation numeric check (clicks_per_rotation > 0),
  add column if not exists display_unit text check (char_length(display_unit) <= 24),
  add column if not exists temperature_adjustable boolean,
  add column if not exists minimum_temperature numeric,
  add column if not exists maximum_temperature numeric,
  add column if not exists supports_preinfusion boolean,
  add column if not exists supports_pressure_adjustment boolean,
  add column if not exists nominal_dose_grams numeric check (nominal_dose_grams > 0),
  add column if not exists minimum_dose_grams numeric check (minimum_dose_grams > 0),
  add column if not exists maximum_dose_grams numeric check (maximum_dose_grams > 0);

alter table public.shots
  add column if not exists target_recipe_snapshot jsonb,
  add column if not exists first_drop_seconds numeric check (first_drop_seconds >= 0),
  add column if not exists pressure_bar numeric check (pressure_bar > 0 and pressure_bar <= 20),
  add column if not exists taste_balance smallint check (taste_balance between -2 and 2),
  add column if not exists sweetness smallint check (sweetness between 1 and 5),
  add column if not exists acidity_quality smallint check (acidity_quality between 1 and 5),
  add column if not exists bitterness_quality smallint check (bitterness_quality between 1 and 5),
  add column if not exists body_rating smallint check (body_rating between 1 and 5),
  add column if not exists clarity_rating smallint check (clarity_rating between 1 and 5),
  add column if not exists aroma_rating smallint check (aroma_rating between 1 and 5),
  add column if not exists aftertaste_rating smallint check (aftertaste_rating between 1 and 5),
  add column if not exists astringency_severity smallint check (astringency_severity between 0 and 4),
  add column if not exists channeling_severity smallint check (channeling_severity between 0 and 4),
  add column if not exists spraying_severity smallint check (spraying_severity between 0 and 4),
  add column if not exists flow_evenness_rating smallint check (flow_evenness_rating between 1 and 5),
  add column if not exists early_blonding_severity smallint check (early_blonding_severity between 0 and 4),
  add column if not exists puck_damage_severity smallint check (puck_damage_severity between 0 and 4),
  add column if not exists shower_screen_imprint boolean,
  add column if not exists puck_screen_imprint boolean,
  add column if not exists strength_perception smallint check (strength_perception between -2 and 2),
  add column if not exists tamp_level text check (tamp_level in ('level', 'slanted')),
  add column if not exists recommendation_applied boolean,
  add column if not exists recommendation_changes jsonb,
  add column if not exists experiment_mode boolean not null default false;

create table public.target_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_id uuid references public.beans(id) on delete cascade,
  machine_id uuid references public.equipment(id) on delete cascade,
  grinder_id uuid references public.equipment(id) on delete cascade,
  basket_id uuid references public.equipment(id) on delete cascade,
  source_shot_id uuid references public.shots(id) on delete set null,
  name text not null default 'Referenzrezept' check (char_length(name) between 1 and 120),
  recipe_snapshot jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index target_recipes_active_setup_idx
  on public.target_recipes (
    user_id,
    coalesce(bean_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(machine_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(grinder_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(basket_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) where is_active;

create table public.recommendation_bundles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_shot_id uuid not null references public.shots(id) on delete cascade,
  bean_id uuid references public.beans(id) on delete set null,
  machine_id uuid references public.equipment(id) on delete set null,
  grinder_id uuid references public.equipment(id) on delete set null,
  basket_id uuid references public.equipment(id) on delete set null,
  target_recipe_snapshot jsonb,
  engine_version text not null,
  primary_action jsonb not null,
  execution_adjustments jsonb,
  confidence numeric not null check (confidence between 0 and 1),
  confidence_label text not null check (confidence_label in ('Niedrige Sicherheit', 'Mittlere Sicherheit', 'Hohe Sicherheit')),
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'applied', 'dismissed', 'superseded', 'completed')),
  applied_at timestamptz,
  dismissed_at timestamptz,
  resulting_shot_id uuid references public.shots(id) on delete set null,
  user_feedback text check (user_feedback in ('helpful', 'not_helpful')),
  outcome jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_shot_id, engine_version),
  unique (id, user_id)
);

alter table public.shots
  add column if not exists applied_recommendation_id uuid references public.recommendation_bundles(id) on delete set null;

alter table public.user_settings
  add column if not exists reference_shot_id uuid references public.shots(id) on delete set null,
  add column if not exists starter_recipe jsonb;

create index recommendation_bundles_user_status_created_idx
  on public.recommendation_bundles (user_id, status, created_at desc);
create index recommendation_bundles_resulting_shot_idx
  on public.recommendation_bundles (resulting_shot_id) where resulting_shot_id is not null;
create index target_recipes_user_active_idx
  on public.target_recipes (user_id, is_active, updated_at desc);

create trigger recommendation_bundles_updated_at before update on public.recommendation_bundles
  for each row execute function public.set_updated_at();
create trigger target_recipes_updated_at before update on public.target_recipes
  for each row execute function public.set_updated_at();

alter table public.recommendation_bundles enable row level security;
alter table public.target_recipes enable row level security;

create policy "recommendations_select_own" on public.recommendation_bundles for select to authenticated using ((select auth.uid()) = user_id);
create policy "recommendations_insert_own" on public.recommendation_bundles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "recommendations_update_own" on public.recommendation_bundles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "recommendations_delete_own" on public.recommendation_bundles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "target_recipes_select_own" on public.target_recipes for select to authenticated using ((select auth.uid()) = user_id);
create policy "target_recipes_insert_own" on public.target_recipes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "target_recipes_update_own" on public.target_recipes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "target_recipes_delete_own" on public.target_recipes for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.validate_recommendation_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.shots where id = new.source_shot_id and user_id = new.user_id) then
    raise exception 'Invalid source shot ownership';
  end if;
  if new.resulting_shot_id is not null and not exists (select 1 from public.shots where id = new.resulting_shot_id and user_id = new.user_id) then
    raise exception 'Invalid resulting shot ownership';
  end if;
  return new;
end;
$$;

create trigger recommendation_bundles_validate_ownership before insert or update on public.recommendation_bundles
  for each row execute function public.validate_recommendation_ownership();

create or replace function public.validate_recommendation_links()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.applied_recommendation_id is not null and not exists (
    select 1 from public.recommendation_bundles where id = new.applied_recommendation_id and user_id = new.user_id
  ) then raise exception 'Invalid recommendation ownership'; end if;
  return new;
end;
$$;

create trigger shots_validate_recommendation before insert or update of applied_recommendation_id on public.shots
  for each row execute function public.validate_recommendation_links();

create or replace function public.validate_target_recipe_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.bean_id is not null and not exists (select 1 from public.beans where id = new.bean_id and user_id = new.user_id) then raise exception 'Invalid bean ownership'; end if;
  if new.source_shot_id is not null and not exists (select 1 from public.shots where id = new.source_shot_id and user_id = new.user_id) then raise exception 'Invalid shot ownership'; end if;
  if new.machine_id is not null and not exists (select 1 from public.equipment where id = new.machine_id and user_id = new.user_id and type = 'machine') then raise exception 'Invalid machine ownership'; end if;
  if new.grinder_id is not null and not exists (select 1 from public.equipment where id = new.grinder_id and user_id = new.user_id and type = 'grinder') then raise exception 'Invalid grinder ownership'; end if;
  if new.basket_id is not null and not exists (select 1 from public.equipment where id = new.basket_id and user_id = new.user_id and type = 'basket') then raise exception 'Invalid basket ownership'; end if;
  return new;
end;
$$;

create trigger target_recipes_validate_ownership before insert or update on public.target_recipes
  for each row execute function public.validate_target_recipe_ownership();
