-- Security hardening for checkout and stock updates.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- Important: paste and run the whole file from the first line.
-- If the editor has only a fragment selected, Supabase runs only that fragment.
--
-- What this does:
-- 1) Removes direct public inserts into sales and sale_lines.
-- 2) Forces public checkout to go through create_pending_sale.
-- 3) Validates seller status, stock availability, and seller ownership inside RPCs.
-- 4) Restricts set_sale_status so only the owning seller can update a sale status.

drop policy if exists "Customers can create pending sales" on public.sales;
drop policy if exists "Customers can create sale lines" on public.sale_lines;

alter table public.sales
  add column if not exists delivery_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sales_delivery_status_valid'
  ) then
    alter table public.sales
      add constraint sales_delivery_status_valid
      check (delivery_status is null or delivery_status in ('delivery_pending', 'shipped', 'delivered'))
      not valid;
  end if;
end;
$$;

create or replace function public.create_pending_sale(
  p_seller_id uuid,
  p_customer_name text,
  p_customer_whatsapp text,
  p_customer_note text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_line jsonb;
  v_total integer := 0;
  v_quantity integer;
  v_price integer;
  v_available integer;
begin
  if not exists (
    select 1
    from public.sellers
    where id = p_seller_id
      and active = true
      and (
        subscription_plan in ('lifetime', 'owner')
        or subscription_until is null
        or subscription_until >= current_date
      )
  ) then
    raise exception 'Seller is not active';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Sale has no lines';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_quantity := greatest(1, coalesce((v_line->>'quantity')::integer, 1));
    v_price := greatest(0, coalesce((v_line->>'unit_price_ars')::integer, 0));

    if v_line->>'item_type' = 'card' then
      select quantity - reserved
      into v_available
      from public.stock_cards
      where id = nullif(v_line->>'stock_card_id', '')::uuid
        and seller_id = p_seller_id
      for update;

      if v_available is null or v_available < v_quantity then
        raise exception 'Not enough card stock';
      end if;
    elsif v_line->>'item_type' = 'product' then
      select quantity - reserved
      into v_available
      from public.stock_products
      where id = nullif(v_line->>'stock_product_id', '')::uuid
        and seller_id = p_seller_id
        and active = true
      for update;

      if v_available is null or v_available < v_quantity then
        raise exception 'Not enough product stock';
      end if;
    else
      raise exception 'Invalid line item type';
    end if;

    v_total := v_total + (v_quantity * v_price);
  end loop;

  insert into public.sales (
    seller_id,
    customer_name,
    customer_whatsapp,
    customer_note,
    status,
    stock_applied,
    total_ars,
    status_changed_at
  )
  values (
    p_seller_id,
    coalesce(nullif(p_customer_name, ''), 'Cliente sin nombre'),
    p_customer_whatsapp,
    p_customer_note,
    'pending',
    false,
    v_total,
    current_date
  )
  returning id into v_sale_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.sale_lines (
      sale_id,
      seller_id,
      item_type,
      stock_card_id,
      stock_product_id,
      card_number,
      expansion,
      variant_type,
      color_variant,
      product_name,
      quantity,
      unit_price_ars
    )
    values (
      v_sale_id,
      p_seller_id,
      v_line->>'item_type',
      nullif(v_line->>'stock_card_id', '')::uuid,
      nullif(v_line->>'stock_product_id', '')::uuid,
      nullif(v_line->>'card_number', '')::integer,
      nullif(v_line->>'expansion', ''),
      nullif(v_line->>'variant_type', ''),
      nullif(v_line->>'color_variant', ''),
      nullif(v_line->>'product_name', ''),
      greatest(1, coalesce((v_line->>'quantity')::integer, 1)),
      greatest(0, coalesce((v_line->>'unit_price_ars')::integer, 0))
    );
  end loop;

  return v_sale_id;
end;
$$;

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
    delivery_status = case when p_status = 'cancelled' then null else delivery_status end,
    stock_applied = (v_new_state <> 'none'),
    status_changed_at = case when status is distinct from p_status then current_date else status_changed_at end,
    updated_at = now()
  where id = p_sale_id;
end;
$$;

grant execute on function public.create_pending_sale(uuid, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.set_sale_status(uuid, text) to authenticated;
