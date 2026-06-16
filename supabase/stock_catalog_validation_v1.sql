-- Stock/catalog validation.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- What this does:
-- 1) Validates every stock_cards insert/update against catalog_cards.
-- 2) Auto-fills catalog_card_id for Cromeros base cards when it is missing.
-- 3) Rejects invalid card numbers, expansions, variant types, or variant colors.
-- 4) Adds defensive stock quantity/price checks for future writes.
--
-- This is additive. It does not delete stock or sales.

create or replace function public.validate_stock_card_catalog()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_catalog public.catalog_cards%rowtype;
begin
  new.collection := coalesce(nullif(new.collection, ''), 'cromeros');

  if new.catalog_card_id is null then
    select *
    into v_catalog
    from public.catalog_cards
    where collection = new.collection
      and card_number = new.card_number
      and expansion = new.expansion
      and print_key = 'base'
      and active = true
    limit 1;
  else
    select *
    into v_catalog
    from public.catalog_cards
    where id = new.catalog_card_id
      and active = true
    limit 1;
  end if;

  if v_catalog.id is null then
    raise exception 'Card is not in catalog';
  end if;

  if v_catalog.collection <> new.collection
    or v_catalog.card_number <> new.card_number
    or v_catalog.expansion <> new.expansion then
    raise exception 'Stock card does not match catalog card';
  end if;

  if not exists (
    select 1
    from public.catalog_card_variants ccv
    where ccv.catalog_card_id = v_catalog.id
      and ccv.variant_type = new.variant_type
      and ccv.color_variant = new.color_variant
      and ccv.active = true
  ) then
    raise exception 'Variant is not valid for this catalog card';
  end if;

  new.catalog_card_id := v_catalog.id;
  return new;
end;
$$;

drop trigger if exists validate_stock_card_catalog_before_write on public.stock_cards;
create trigger validate_stock_card_catalog_before_write
before insert or update of collection, catalog_card_id, card_number, expansion, variant_type, color_variant
on public.stock_cards
for each row
execute function public.validate_stock_card_catalog();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_cards_quantity_nonnegative'
  ) then
    alter table public.stock_cards
      add constraint stock_cards_quantity_nonnegative check (quantity >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_cards_reserved_nonnegative'
  ) then
    alter table public.stock_cards
      add constraint stock_cards_reserved_nonnegative check (reserved >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_cards_reserved_not_above_quantity'
  ) then
    alter table public.stock_cards
      add constraint stock_cards_reserved_not_above_quantity check (reserved <= quantity) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_cards_price_nonnegative'
  ) then
    alter table public.stock_cards
      add constraint stock_cards_price_nonnegative check (price_ars >= 0) not valid;
  end if;
end;
$$;

select
  'stock_catalog_validation_v1 ready' as status,
  (select count(*) from public.stock_cards where catalog_card_id is null) as stock_without_catalog_id;
