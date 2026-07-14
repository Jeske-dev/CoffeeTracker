-- Supports the beans collection query ordered by most recently edited.
create index if not exists beans_user_updated_idx
  on public.beans (user_id, updated_at desc);

-- Supports active equipment lists without scanning archived rows first.
create index if not exists equipment_user_archive_created_idx
  on public.equipment (user_id, archived_at, created_at asc);
