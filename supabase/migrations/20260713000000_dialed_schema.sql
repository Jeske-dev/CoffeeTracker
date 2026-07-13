create type public.bean_process as enum ('washed', 'natural', 'honey', 'anaerobic', 'unknown');
create type public.roast_level as enum ('light', 'medium_light', 'medium', 'dark');
create type public.equipment_type as enum ('machine', 'grinder', 'basket', 'tool');
create type public.shot_taste as enum ('very_sour', 'sour', 'balanced', 'bitter', 'very_bitter');
create type public.shot_flow as enum ('even', 'minor_channeling', 'channeling', 'spritzing');
create type public.puck_state as enum ('dry', 'ideal', 'wet', 'stuck');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  roaster text not null check (char_length(roaster) between 1 and 120),
  roast_date date not null,
  origin text check (char_length(origin) <= 120),
  process public.bean_process not null default 'unknown',
  roast_level public.roast_level,
  tasting_notes text[] not null default '{}',
  purchase_date date,
  price_cents integer check (price_cents >= 0),
  package_grams numeric(8,2) check (package_grams > 0),
  is_decaf boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.equipment_type not null,
  name text not null check (char_length(name) between 1 and 120),
  notes text check (char_length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index equipment_active_name_idx
  on public.equipment (user_id, type, lower(name)) where archived_at is null;

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_machine_id uuid references public.equipment(id) on delete set null,
  default_grinder_id uuid references public.equipment(id) on delete set null,
  last_bean_id uuid references public.beans(id) on delete set null,
  auto_fill boolean not null default true,
  default_prep_tools text[] not null default array['WDT','Tamper','Puck Screen'],
  dial_in_suggestions_enabled boolean not null default true,
  roast_age_warning_enabled boolean not null default true,
  roast_age_warning_days integer not null default 45 check (roast_age_warning_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_id uuid not null,
  machine_id uuid,
  grinder_id uuid,
  basket_id uuid,
  shot_at timestamptz not null default now(),
  grind_setting text not null check (char_length(grind_setting) between 1 and 40),
  dose_grams numeric(7,2) not null check (dose_grams > 0),
  temperature_c numeric(5,2) check (temperature_c between 50 and 110),
  preinfusion_seconds numeric(6,2) check (preinfusion_seconds >= 0),
  prep_tools text[] not null default '{}',
  extraction_seconds numeric(7,2) not null check (extraction_seconds > 0),
  stop_weight_grams numeric(7,2) not null check (stop_weight_grams >= 0),
  final_yield_grams numeric(7,2) not null check (final_yield_grams > 0),
  taste public.shot_taste not null,
  flow public.shot_flow not null,
  puck public.puck_state not null,
  notes text check (char_length(notes) <= 2000),
  score smallint not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shots_bean_owner_fk foreign key (bean_id, user_id) references public.beans(id, user_id),
  constraint shots_machine_fk foreign key (machine_id) references public.equipment(id) on delete set null,
  constraint shots_grinder_fk foreign key (grinder_id) references public.equipment(id) on delete set null,
  constraint shots_basket_fk foreign key (basket_id) references public.equipment(id) on delete set null
);

create index shots_user_shot_at_idx on public.shots (user_id, shot_at desc);
create index shots_user_bean_shot_at_idx on public.shots (user_id, bean_id, shot_at desc);
create index beans_user_archive_created_idx on public.beans (user_id, archived_at, created_at desc);
create index equipment_user_type_archive_idx on public.equipment (user_id, type, archived_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_dialed_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'shots' then
    if new.machine_id is not null and not exists (select 1 from public.equipment where id = new.machine_id and user_id = new.user_id and type = 'machine') then raise exception 'Invalid machine ownership'; end if;
    if new.grinder_id is not null and not exists (select 1 from public.equipment where id = new.grinder_id and user_id = new.user_id and type = 'grinder') then raise exception 'Invalid grinder ownership'; end if;
    if new.basket_id is not null and not exists (select 1 from public.equipment where id = new.basket_id and user_id = new.user_id and type = 'basket') then raise exception 'Invalid basket ownership'; end if;
  else
    if new.last_bean_id is not null and not exists (select 1 from public.beans where id = new.last_bean_id and user_id = new.user_id) then raise exception 'Invalid bean ownership'; end if;
    if new.default_machine_id is not null and not exists (select 1 from public.equipment where id = new.default_machine_id and user_id = new.user_id and type = 'machine') then raise exception 'Invalid machine ownership'; end if;
    if new.default_grinder_id is not null and not exists (select 1 from public.equipment where id = new.default_grinder_id and user_id = new.user_id and type = 'grinder') then raise exception 'Invalid grinder ownership'; end if;
  end if;
  return new;
end;
$$;

create trigger shots_validate_ownership before insert or update on public.shots for each row execute function public.validate_dialed_ownership();
create trigger settings_validate_ownership before insert or update on public.user_settings for each row execute function public.validate_dialed_ownership();

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger beans_updated_at before update on public.beans for each row execute function public.set_updated_at();
create trigger equipment_updated_at before update on public.equipment for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
create trigger shots_updated_at before update on public.shots for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger security definer language plpgsql set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.beans enable row level security;
alter table public.equipment enable row level security;
alter table public.user_settings enable row level security;
alter table public.shots enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "beans_select_own" on public.beans for select to authenticated using ((select auth.uid()) = user_id);
create policy "beans_insert_own" on public.beans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "beans_update_own" on public.beans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "beans_delete_own" on public.beans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "equipment_select_own" on public.equipment for select to authenticated using ((select auth.uid()) = user_id);
create policy "equipment_insert_own" on public.equipment for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "equipment_update_own" on public.equipment for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "equipment_delete_own" on public.equipment for delete to authenticated using ((select auth.uid()) = user_id);

create policy "settings_select_own" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings_insert_own" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "settings_update_own" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings_delete_own" on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);

create policy "shots_select_own" on public.shots for select to authenticated using ((select auth.uid()) = user_id);
create policy "shots_insert_own" on public.shots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "shots_update_own" on public.shots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "shots_delete_own" on public.shots for delete to authenticated using ((select auth.uid()) = user_id);
