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
  v_should_apply boolean;
  v_direction integer := 0;
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

  v_should_apply := p_status in ('reserved', 'confirmed', 'delivered');

  if v_should_apply and not v_sale.stock_applied then
    v_direction := 1;
  elsif not v_should_apply and v_sale.stock_applied then
    v_direction := -1;
  end if;

  if v_direction = 1 then
    if exists (
      select 1
      from public.sale_lines sl
      join public.stock_cards sc on sc.id = sl.stock_card_id
      where sl.sale_id = p_sale_id
        and sl.item_type = 'card'
      group by sc.id, sc.quantity, sc.reserved
      having sc.reserved + sum(sl.quantity) > sc.quantity
    ) then
      raise exception 'Not enough card stock';
    end if;

    if exists (
      select 1
      from public.sale_lines sl
      join public.stock_products sp on sp.id = sl.stock_product_id
      where sl.sale_id = p_sale_id
        and sl.item_type = 'product'
      group by sp.id, sp.quantity
      having sum(sl.quantity) > sp.quantity
    ) then
      raise exception 'Not enough product stock';
    end if;
  end if;

  if v_direction <> 0 then
    update public.stock_cards sc
    set reserved = greatest(0, sc.reserved + grouped.quantity * v_direction)
    from (
      select stock_card_id, sum(quantity)::integer as quantity
      from public.sale_lines
      where sale_id = p_sale_id
        and item_type = 'card'
        and stock_card_id is not null
      group by stock_card_id
    ) grouped
    where sc.id = grouped.stock_card_id
      and sc.seller_id = v_sale.seller_id;

    update public.stock_products sp
    set quantity = greatest(0, sp.quantity - grouped.quantity * v_direction)
    from (
      select stock_product_id, sum(quantity)::integer as quantity
      from public.sale_lines
      where sale_id = p_sale_id
        and item_type = 'product'
        and stock_product_id is not null
      group by stock_product_id
    ) grouped
    where sp.id = grouped.stock_product_id
      and sp.seller_id = v_sale.seller_id;
  end if;

  update public.sales
  set
    status = p_status,
    stock_applied = v_should_apply,
    status_changed_at = case when status is distinct from p_status then current_date else status_changed_at end,
    updated_at = now()
  where id = p_sale_id;
end;
$$;

grant execute on function public.create_pending_sale(uuid, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.set_sale_status(uuid, text) to authenticated;
