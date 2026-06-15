-- Admin tools for the owner account.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- What this does:
-- 1) Lets the owner list every seller, including inactive sellers.
-- 2) Lets the owner pause/reactivate sellers and renew 1 to 12 months or lifetime.
-- 3) Keeps owner accounts protected from accidental pause/plan edits.

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sellers
    where id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.admin_list_sellers()
returns table (
  id uuid,
  slug text,
  display_name text,
  whatsapp text,
  role text,
  active boolean,
  created_at timestamptz,
  shipping_enabled boolean,
  shipping_companies text[],
  location text,
  subscription_until date,
  subscription_plan text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Not allowed';
  end if;

  return query
    select
      s.id,
      s.slug,
      s.display_name,
      s.whatsapp,
      s.role,
      s.active,
      s.created_at,
      s.shipping_enabled,
      s.shipping_companies,
      s.location,
      s.subscription_until,
      s.subscription_plan
    from public.sellers s
    order by s.created_at desc;
end;
$$;

create or replace function public.admin_update_seller_subscription(
  p_seller_id uuid,
  p_active boolean,
  p_months integer default 1,
  p_lifetime boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months integer := least(12, greatest(1, coalesce(p_months, 1)));
  v_base_date date;
  v_target_role text;
begin
  if not public.is_owner() then
    raise exception 'Not allowed';
  end if;

  select role, greatest(current_date, coalesce(subscription_until, current_date))
  into v_target_role, v_base_date
  from public.sellers
  where id = p_seller_id
  for update;

  if not found then
    raise exception 'Seller not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Owner seller cannot be edited here';
  end if;

  update public.sellers
  set
    active = coalesce(p_active, active),
    subscription_plan = case when p_lifetime then 'lifetime' else 'monthly' end,
    subscription_until = case
      when p_lifetime then null
      else (v_base_date + make_interval(months => v_months))::date
    end,
    updated_at = now()
  where id = p_seller_id;
end;
$$;

grant execute on function public.is_owner() to authenticated;
grant execute on function public.admin_list_sellers() to authenticated;
grant execute on function public.admin_update_seller_subscription(uuid, boolean, integer, boolean) to authenticated;
