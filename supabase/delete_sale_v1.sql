-- Safe delete for seller sales.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- What this does:
-- - Allows the owning seller to permanently delete only cancelled or archived sales.
-- - If an archived sale is reserved/confirmed, it first calls set_sale_status(..., 'cancelled')
--   so reserved/sold stock is returned consistently before deleting.
-- - Deletes sale_lines before sales to avoid foreign-key issues.
-- - Does not delete stock, products, sellers, or unrelated data.

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale record;
begin
  select id, seller_id, status, archived_at
  into v_sale
  from public.sales
  where id = p_sale_id;

  if not found then
    raise exception 'Sale not found';
  end if;

  if v_sale.seller_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;

  if v_sale.status <> 'cancelled' and v_sale.archived_at is null then
    raise exception 'Only cancelled or archived sales can be deleted';
  end if;

  if v_sale.status <> 'cancelled' then
    perform public.set_sale_status(p_sale_id, 'cancelled');
  end if;

  delete from public.sale_lines
  where sale_id = p_sale_id
    and seller_id = auth.uid();

  delete from public.sales
  where id = p_sale_id
    and seller_id = auth.uid();
end;
$$;

grant execute on function public.delete_sale(uuid) to authenticated;

select 'delete_sale_v1 ready' as status;
