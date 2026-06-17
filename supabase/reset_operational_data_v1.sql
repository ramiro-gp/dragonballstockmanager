-- Reset operational data for a clean real-stock start.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- Keeps:
-- - Supabase Auth users.
-- - Owner seller profiles.
-- - Owner seller_settings.
-- - Cromeros master catalog tables.
-- - App SQL functions, policies, and configuration.
--
-- Deletes:
-- - Stock cards and products.
-- - Sales, sale lines, payments, and balance adjustments.
-- - Non-owner seller profiles and their settings.

do $$
begin
  if to_regclass('public.payments') is not null then
    delete from public.payments;
  end if;

  if to_regclass('public.sale_lines') is not null then
    delete from public.sale_lines;
  end if;

  if to_regclass('public.sales') is not null then
    delete from public.sales;
  end if;

  if to_regclass('public.stock_cards') is not null then
    delete from public.stock_cards;
  end if;

  if to_regclass('public.stock_products') is not null then
    delete from public.stock_products;
  end if;

  if to_regclass('public.balance_adjustments') is not null then
    delete from public.balance_adjustments;
  end if;

  if to_regclass('public.seller_settings') is not null then
    delete from public.seller_settings
    where seller_id in (
      select id
      from public.sellers
      where role <> 'owner'
    );
  end if;

  if to_regclass('public.sellers') is not null then
    delete from public.sellers
    where role <> 'owner';
  end if;
end;
$$;

select
  (select count(*) from public.sellers where role = 'owner') as owner_sellers,
  (select count(*) from public.sellers where role <> 'owner') as non_owner_sellers,
  (select count(*) from public.stock_cards) as stock_cards,
  (select count(*) from public.stock_products) as stock_products,
  (select count(*) from public.sales) as sales,
  (select count(*) from public.sale_lines) as sale_lines,
  (select count(*) from public.balance_adjustments) as balance_adjustments;
