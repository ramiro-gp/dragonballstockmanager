-- Manual sales creation for authenticated sellers.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- What this does:
-- - Lets the owning seller create a manual sale from existing stock items.
-- - Validates exact item availability with quantity - reserved.
-- - Creates sale_lines and an optional payment record.
-- - Applies stock by reusing set_sale_status, so reserved/confirmed rules stay centralized.
-- - Does not delete or rewrite existing data.

create or replace function public.create_manual_sale(
  p_seller_id uuid,
  p_customer_name text,
  p_customer_whatsapp text,
  p_customer_note text,
  p_sale_date date,
  p_status text,
  p_lines jsonb,
  p_paid_amount integer default 0
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
  v_status text := coalesce(nullif(p_status, ''), 'confirmed');
begin
  if auth.uid() is null or p_seller_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;

  if v_status not in ('pending', 'reserved', 'confirmed', 'delivered') then
    raise exception 'Invalid manual sale status';
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
    manual,
    total_ars,
    status_changed_at,
    created_at
  )
  values (
    p_seller_id,
    coalesce(nullif(p_customer_name, ''), 'Venta manual'),
    p_customer_whatsapp,
    p_customer_note,
    'pending',
    false,
    true,
    v_total,
    coalesce(p_sale_date, current_date),
    coalesce(p_sale_date, current_date)
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

  if v_status <> 'pending' then
    perform public.set_sale_status(v_sale_id, v_status);
    update public.sales
    set status_changed_at = coalesce(p_sale_date, current_date)
    where id = v_sale_id;
  end if;

  if greatest(0, coalesce(p_paid_amount, 0)) > 0 then
    insert into public.payments (seller_id, sale_id, amount_ars, note, paid_at)
    values (
      p_seller_id,
      v_sale_id,
      greatest(0, p_paid_amount),
      'Venta manual',
      coalesce(p_sale_date, current_date)
    );
  end if;

  return v_sale_id;
end;
$$;

grant execute on function public.create_manual_sale(uuid, text, text, text, date, text, jsonb, integer) to authenticated;

select 'create_manual_sale_v1 ready' as status;
