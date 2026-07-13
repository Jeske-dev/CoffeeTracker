-- Lokale Demo-Fixtures: nach dem Anlegen eines lokalen Testnutzers dessen UUID einsetzen.
-- Dieses Skript wird nicht automatisch in Produktion ausgeführt.
-- psql variable example: supabase db reset && psql "$DATABASE_URL" -v user_id="..." -f supabase/seed.sql
\if :{?user_id}
insert into public.beans (id,user_id,name,roaster,roast_date,origin,process,roast_level,tasting_notes) values
('10000000-0000-4000-8000-000000000001',:'user_id','La Esperanza','Hoppenworth & Ploch',current_date-16,'Colombia','washed','medium_light',array['Pflaume','Kakao','Karamell']),
('10000000-0000-4000-8000-000000000002',:'user_id','Kayon Mountain','Coffee Circle',current_date-9,'Äthiopien','natural','light',array['Blaubeere','Jasmin']),
('10000000-0000-4000-8000-000000000003',:'user_id','House Espresso','Phoenix Coffee Roasters',current_date-25,'Brasilien','natural','medium',array['Haselnuss','Kakao'])
on conflict do nothing;
insert into public.equipment (id,user_id,type,name) values
('20000000-0000-4000-8000-000000000001',:'user_id','machine','Sage Bambino Plus'),
('20000000-0000-4000-8000-000000000002',:'user_id','grinder','Eureka Mignon') on conflict do nothing;
update public.user_settings set last_bean_id='10000000-0000-4000-8000-000000000001',default_machine_id='20000000-0000-4000-8000-000000000001',default_grinder_id='20000000-0000-4000-8000-000000000002' where user_id=:'user_id';
\else
\echo 'Kein user_id gesetzt; Demo-Seed übersprungen.'
\endif
