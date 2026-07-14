alter table public.shots
  add column if not exists scoring_version text;

alter table public.user_settings
  alter column starter_recipe set default '{"doseGrams":18,"targetYieldGrams":36,"targetExtractionTimeSeconds":30,"grindSetting":null,"prepTools":["WDT"]}'::jsonb;

update public.user_settings
set starter_recipe = '{"doseGrams":18,"targetYieldGrams":36,"targetExtractionTimeSeconds":30,"grindSetting":null,"prepTools":["WDT"]}'::jsonb
where starter_recipe is null;

-- These columns stay available for historical rows, but simplified shots no longer write them.
alter table public.shots alter column grind_setting drop not null;
alter table public.shots alter column extraction_seconds drop not null;
alter table public.shots alter column stop_weight_grams drop not null;
alter table public.shots alter column taste drop not null;
alter table public.shots alter column flow drop not null;
alter table public.shots alter column puck drop not null;
alter table public.shots alter column score drop not null;
alter table public.shots alter column temperature_c drop not null;
alter table public.shots alter column preinfusion_seconds drop not null;
alter table public.shots alter column tds drop not null;
alter table public.shots alter column flow_evenness drop not null;
alter table public.shots alter column channeling drop not null;
alter table public.shots alter column first_drop_seconds drop not null;
alter table public.shots alter column pressure_bar drop not null;
alter table public.shots alter column taste_balance drop not null;
alter table public.shots alter column sweetness drop not null;
alter table public.shots alter column acidity_quality drop not null;
alter table public.shots alter column bitterness_quality drop not null;
alter table public.shots alter column body_rating drop not null;
alter table public.shots alter column clarity_rating drop not null;
alter table public.shots alter column aroma_rating drop not null;
alter table public.shots alter column aftertaste_rating drop not null;
alter table public.shots alter column astringency_severity drop not null;
alter table public.shots alter column channeling_severity drop not null;
alter table public.shots alter column spraying_severity drop not null;
alter table public.shots alter column flow_evenness_rating drop not null;
alter table public.shots alter column early_blonding_severity drop not null;
alter table public.shots alter column puck_damage_severity drop not null;
alter table public.shots alter column shower_screen_imprint drop not null;
alter table public.shots alter column puck_screen_imprint drop not null;
alter table public.shots alter column strength_perception drop not null;
alter table public.shots alter column tamp_level drop not null;
