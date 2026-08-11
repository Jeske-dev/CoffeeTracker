create table public.recommendation_suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  setup_key text not null,
  bean_id uuid references public.beans(id) on delete cascade,
  machine_id uuid references public.equipment(id) on delete cascade,
  grinder_id uuid references public.equipment(id) on delete cascade,
  basket_id uuid references public.equipment(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, setup_key)
);

alter table public.recommendation_suppressions enable row level security;
create policy "recommendation_suppressions_select_own" on public.recommendation_suppressions for select to authenticated using ((select auth.uid()) = user_id);
create policy "recommendation_suppressions_insert_own" on public.recommendation_suppressions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "recommendation_suppressions_delete_own" on public.recommendation_suppressions for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.validate_recommendation_suppression_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.bean_id is not null and not exists (select 1 from public.beans where id = new.bean_id and user_id = new.user_id) then raise exception 'Invalid bean ownership'; end if;
  if new.machine_id is not null and not exists (select 1 from public.equipment where id = new.machine_id and user_id = new.user_id and type = 'machine') then raise exception 'Invalid machine ownership'; end if;
  if new.grinder_id is not null and not exists (select 1 from public.equipment where id = new.grinder_id and user_id = new.user_id and type = 'grinder') then raise exception 'Invalid grinder ownership'; end if;
  if new.basket_id is not null and not exists (select 1 from public.equipment where id = new.basket_id and user_id = new.user_id and type = 'basket') then raise exception 'Invalid basket ownership'; end if;
  return new;
end;
$$;

create trigger recommendation_suppressions_validate_ownership before insert or update on public.recommendation_suppressions
  for each row execute function public.validate_recommendation_suppression_ownership();
