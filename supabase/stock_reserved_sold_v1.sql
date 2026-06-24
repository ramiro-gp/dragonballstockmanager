-- Separate reserved and sold stock states.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- What this does:
-- - Keeps pending/cancelled sales without stock impact.
-- - Makes reserved sales increment `reserved`.
-- - Makes confirmed/delivered sales decrement `quantity` and release any prior reservation.
-- - Keeps sale history and totals unchanged.
--
-- It does not delete or rewrite existing data.

create or replace function public.set_sale_status(
  p_sale_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_line record;
  v_old_state text;
  v_new_state text;
  v_quantity integer;
  v_reserved integer;
begin
  if p_status not in ('pending', 'reserved', 'confirmed', 'delivered', 'cancelled') then
    raise exception 'Invalid sale status';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  if auth.uid() is null or v_sale.seller_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;

  v_old_state := case
    when v_sale.status = 'reserved' then 'reserved'
    when v_sale.status in ('confirmed', 'delivered') then 'sold'
    else 'none'
  end;

  v_new_state := case
    when p_status = 'reserved' then 'reserved'
    when p_status in ('confirmed', 'delivered') then 'sold'
    else 'none'
  end;

  if v_old_state <> v_new_state then
    for v_line in
      select
        item_type,
        stock_card_id,
        stock_product_id,
        sum(quantity)::integer as quantity
      from public.sale_lines
      where sale_id = p_sale_id
      group by item_type, stock_card_id, stock_product_id
    loop
      if v_line.item_type = 'card' then
        select quantity, reserved
        into v_quantity, v_reserved
        from public.stock_cards
        where id = v_line.stock_card_id
          and seller_id = v_sale.seller_id
        for update;

        if not found then
          raise exception 'Card stock not found';
        end if;

        if v_old_state = 'reserved' then
          v_reserved := greatest(0, v_reserved - v_line.quantity);
        elsif v_old_state = 'sold' then
          v_quantity := v_quantity + v_line.quantity;
        end if;

        if v_new_state = 'reserved' then
          if v_quantity - v_reserved < v_line.quantity then
            raise exception 'Not enough card stock';
          end if;
          v_reserved := v_reserved + v_line.quantity;
        elsif v_new_state = 'sold' then
          if v_quantity - v_reserved < v_line.quantity then
            raise exception 'Not enough card stock';
          end if;
          v_quantity := v_quantity - v_line.quantity;
        end if;

        update public.stock_cards
        set
          quantity = greatest(0, v_quantity),
          reserved = greatest(0, v_reserved)
        where id = v_line.stock_card_id
          and seller_id = v_sale.seller_id;
      elsif v_line.item_type = 'product' then
        select quantity, reserved
        into v_quantity, v_reserved
        from public.stock_products
        where id = v_line.stock_product_id
          and seller_id = v_sale.seller_id
        for update;

        if not found then
          raise exception 'Product stock not found';
        end if;

        if v_old_state = 'reserved' then
          v_reserved := greatest(0, v_reserved - v_line.quantity);
        elsif v_old_state = 'sold' then
          v_quantity := v_quantity + v_line.quantity;
        end if;

        if v_new_state = 'reserved' then
          if v_quantity - v_reserved < v_line.quantity then
            raise exception 'Not enough product stock';
          end if;
          v_reserved := v_reserved + v_line.quantity;
        elsif v_new_state = 'sold' then
          if v_quantity - v_reserved < v_line.quantity then
            raise exception 'Not enough product stock';
          end if;
          v_quantity := v_quantity - v_line.quantity;
        end if;

        update public.stock_products
        set
          quantity = greatest(0, v_quantity),
          reserved = greatest(0, v_reserved)
        where id = v_line.stock_product_id
          and seller_id = v_sale.seller_id;
      else
        raise exception 'Invalid line item type';
      end if;
    end loop;
  end if;

  update public.sales
  set
    status = p_status,
    stock_applied = (v_new_state <> 'none'),
    status_changed_at = case when status is distinct from p_status then current_date else status_changed_at end,
    updated_at = now()
  where id = p_sale_id;
end;
$$;

grant execute on function public.set_sale_status(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_products_quantity_nonnegative'
  ) then
    alter table public.stock_products
      add constraint stock_products_quantity_nonnegative check (quantity >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_products_reserved_nonnegative'
  ) then
    alter table public.stock_products
      add constraint stock_products_reserved_nonnegative check (reserved >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_products_reserved_not_above_quantity'
  ) then
    alter table public.stock_products
      add constraint stock_products_reserved_not_above_quantity check (reserved <= quantity) not valid;
  end if;
end;
$$;

select 'stock_reserved_sold_v1 ready' as status;
