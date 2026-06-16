-- Fix for Cromeros hidden cards.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- Context:
-- catalog_master_v1 originally inserted Cartas ocultas as 402-403.
-- Correct range is 402-407.
--
-- This safely inserts only missing 404-407 rows and their common Base variant.

insert into public.catalog_cards (collection, card_number, expansion, print_key)
select 'cromeros', n, 'Cartas ocultas', 'base'
from generate_series(404, 407) as n
on conflict (collection, card_number, print_key) do update
set expansion = excluded.expansion,
    updated_at = now();

insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
select id, 'comun', 'Base', 10
from public.catalog_cards
where collection = 'cromeros'
  and expansion = 'Cartas ocultas'
  and card_number between 404 and 407
on conflict (catalog_card_id, variant_type, color_variant) do nothing;

select
  (select count(*) from public.catalog_cards where collection = 'cromeros') as cromeros_cards,
  (select count(*) from public.catalog_cards where collection = 'cromeros' and expansion = 'Cartas ocultas') as hidden_cards,
  (select count(*) from public.catalog_card_variants ccv join public.catalog_cards cc on cc.id = ccv.catalog_card_id where cc.collection = 'cromeros') as cromeros_variants;
