-- Catalog master for finite card collections.
-- Run in Supabase > SQL Editor > New query > Run.
--
-- What this does:
-- 1) Creates a master catalog of Cromeros cards.
-- 2) Creates valid variant rows for each catalog card.
-- 3) Adds optional catalog_card_id to stock_cards without breaking current stock.
-- 4) Backfills current stock_cards to the base Cromeros catalog card when possible.
--
-- This is intentionally additive. It does not delete existing stock or sale data.

create extension if not exists pgcrypto;

create table if not exists public.catalog_cards (
  id uuid primary key default gen_random_uuid(),
  collection text not null default 'cromeros',
  card_number integer not null,
  expansion text not null,
  print_key text not null default 'base',
  title text,
  special_type text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_cards_collection_check check (collection in ('cromeros', 'leyenda', 'flashgondor')),
  constraint catalog_cards_print_key_check check (print_key <> ''),
  constraint catalog_cards_unique_print unique (collection, card_number, print_key)
);

create table if not exists public.catalog_card_variants (
  id uuid primary key default gen_random_uuid(),
  catalog_card_id uuid not null references public.catalog_cards(id) on delete cascade,
  variant_type text not null,
  color_variant text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint catalog_card_variants_type_check check (variant_type in ('comun', 'fluor', 'holo')),
  constraint catalog_card_variants_unique unique (catalog_card_id, variant_type, color_variant)
);

create index if not exists catalog_cards_collection_number_idx
  on public.catalog_cards(collection, card_number);

create index if not exists catalog_cards_collection_expansion_idx
  on public.catalog_cards(collection, expansion);

create index if not exists catalog_card_variants_card_idx
  on public.catalog_card_variants(catalog_card_id);

alter table public.stock_cards
  add column if not exists collection text not null default 'cromeros';

alter table public.stock_cards
  add column if not exists catalog_card_id uuid references public.catalog_cards(id);

create index if not exists stock_cards_catalog_card_id_idx
  on public.stock_cards(catalog_card_id);

insert into public.catalog_cards (collection, card_number, expansion, print_key)
select 'cromeros', n, expansion, 'base'
from (
  select generate_series(1, 129) as n, 'Expansión 1' as expansion
  union all select generate_series(130, 265), 'Expansión 2'
  union all select generate_series(266, 401), 'Expansión 3'
  union all select generate_series(402, 407), 'Cartas ocultas'
  union all select generate_series(408, 543), 'Expansión 4'
  union all select generate_series(544, 679), 'Expansión 5'
  union all select generate_series(680, 815), 'Expansión 6'
  union all select generate_series(816, 951), 'Personajes'
  union all select generate_series(952, 1087), 'Expansión 7'
  union all select generate_series(1088, 1223), 'Guerreros Legendarios 1'
  union all select generate_series(1224, 1359), 'Guerreros Legendarios 2'
  union all select generate_series(1360, 1495), 'Super Batalla 1'
  union all select generate_series(1496, 1631), 'Super Batalla 2'
  union all select generate_series(1632, 1760), 'GT'
  union all select generate_series(1761, 1848), 'Batalla Final 1'
  union all select generate_series(1849, 1936), 'Batalla Final 2'
) ranges
on conflict (collection, card_number, print_key) do update
set expansion = excluded.expansion,
    updated_at = now();

-- Corrected/error duplicate prints.
insert into public.catalog_cards (collection, card_number, expansion, print_key, title, special_type, notes)
values
  ('cromeros', 103, 'Expansión 1', 'corregida', 'NO ME DETENDRÁN', 'corregida', 'Versión corregida informada por el catálogo del vendedor.'),
  ('cromeros', 103, 'Expansión 1', 'error', 'COOLER', 'error', 'Carta con error de texto: Cooler/Freezer.'),
  ('cromeros', 109, 'Expansión 1', 'corregida', 'Egos enfrentados', 'corregida', 'Versión corregida informada por el catálogo del vendedor.'),
  ('cromeros', 109, 'Expansión 1', 'error', 'Hermano vs Hermano', 'error', 'Carta con error de texto.'),
  ('cromeros', 124, 'Expansión 1', 'corregida', 'Los deberes de Gohan', 'corregida', 'Versión corregida informada por el catálogo del vendedor.'),
  ('cromeros', 124, 'Expansión 1', 'error', 'Son Goten', 'error', 'Carta con error de texto.'),
  ('cromeros', 165, 'Expansión 2', 'corregida', 'El pequeño Gohan', 'corregida', 'Versión corregida informada por el catálogo del vendedor.'),
  ('cromeros', 165, 'Expansión 2', 'error', 'El pequeño Goku', 'error', 'Carta con error de texto.')
on conflict (collection, card_number, print_key) do update
set expansion = excluded.expansion,
    title = excluded.title,
    special_type = excluded.special_type,
    notes = excluded.notes,
    updated_at = now();

-- Expansión 4 has duplicate ghost/special prints from 504 to 513.
insert into public.catalog_cards (collection, card_number, expansion, print_key, special_type, notes)
select 'cromeros', n, 'Expansión 4', 'fantasma', 'fantasma', 'Carta fantasma/especial con número repetido.'
from generate_series(504, 513) as n
on conflict (collection, card_number, print_key) do update
set expansion = excluded.expansion,
    special_type = excluded.special_type,
    notes = excluded.notes,
    updated_at = now();

-- Default: every base/error/corrected/ghost card can at least be loaded as common Base.
insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
select id, 'comun', 'Base', 10
from public.catalog_cards
where collection = 'cromeros'
on conflict (catalog_card_id, variant_type, color_variant) do nothing;

create or replace function public.seed_catalog_variants(
  p_collection text,
  p_numbers integer[],
  p_kinds text[],
  p_fluor_colors text[],
  p_holo_colors text[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_card_id uuid;
  v_color text;
  v_order integer;
begin
  for v_card_id in
    select id
    from public.catalog_cards
    where collection = p_collection
      and card_number = any(p_numbers)
      and print_key = 'base'
  loop
    delete from public.catalog_card_variants where catalog_card_id = v_card_id;

    if 'comun' = any(p_kinds) then
      insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
      values (v_card_id, 'comun', 'Base', 10)
      on conflict (catalog_card_id, variant_type, color_variant) do nothing;
    end if;

    if 'fluor' = any(p_kinds) then
      v_order := 100;
      foreach v_color in array p_fluor_colors loop
        insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
        values (v_card_id, 'fluor', v_color, v_order)
        on conflict (catalog_card_id, variant_type, color_variant) do nothing;
        v_order := v_order + 1;
      end loop;
    end if;

    if 'holo' = any(p_kinds) then
      v_order := 200;
      foreach v_color in array p_holo_colors loop
        insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
        values (v_card_id, 'holo', v_color, v_order)
        on conflict (catalog_card_id, variant_type, color_variant) do nothing;
        v_order := v_order + 1;
      end loop;
    end if;
  end loop;
end;
$$;

select public.seed_catalog_variants(
  'cromeros',
  array[816,817,818,819,820,821,822,823,824,825,826,827,828,829,830,831,832,833,834,835,836,837,838,839,840,841,842,843,844,845,846,847,848,849,850,851,852,853,854,855,856,857,858,859,860,868,869,870,871,872,880,881,882,883,884,887,892,893,894,895,896,904,905,906,907,908,916,917,918,919,920,928,929,930,931,932,940,941,942,943,944],
  array['comun','fluor','holo'],
  array['Fluor'],
  array['Dorado','Plateado','Dorado opaco','Plateado opaco','Rojo','Azul','Verde','Violeta','Amarillo','Bronce','Patrones','Arcoiris','Tornasolado']
);

select public.seed_catalog_variants(
  'cromeros',
  array[953,954,957,958,963,968,969,970,972,973,975,977,984,988,989,991,993,994,997,1006,1008,1010,1019,1027,1028,1029,1036,1037,1038,1051,1053,1055,1056,1058,1065,1069,1076,1078,1080,1084],
  array['comun','holo'],
  array[]::text[],
  array['Dorado','Plateado','Dorado opaco','Plateado opaco','Rojo','Azul','Verde','Violeta','Amarillo','Bronce','Naranja']
);

select public.seed_catalog_variants(
  'cromeros',
  array[1088,1090,1091,1092,1093,1094,1098,1099,1110,1111,1112,1113,1123,1125,1126,1127,1129,1131,1134,1146,1147,1148,1149,1157,1161,1162,1167,1169,1170,1181,1182,1183,1184,1197,1199,1204,1207,1214,1222,1223],
  array['comun','holo'],
  array[]::text[],
  array['Patrones','Rojo','Amarillo','Plateado','Verde','Azul','Violeta','Turquesa','Bronce']
);

select public.seed_catalog_variants(
  'cromeros',
  array[1225,1226,1236,1239,1244,1245,1246,1248,1249,1251,1254,1259,1260,1261,1262,1263,1272,1275,1276,1278,1280,1284,1291,1298,1299,1309,1320,1322,1326,1329,1334,1338,1339,1341,1348,1350,1354,1355,1359],
  array['fluor','holo'],
  array['Rosa','Naranja','Verde'],
  array['Rojo','Azul','Verde','Amarillo','Turquesa','Violeta','Bronce']
);

select public.seed_catalog_variants(
  'cromeros',
  array(select generate_series(1360, 1495)),
  array['fluor','holo'],
  array['Rojo','Amarillo','Naranja','Verde','Rosa'],
  array['Plateado opaco','Amarillo','Rojo','Azul','Verde','Celeste','Naranja']
);

select public.seed_catalog_variants(
  'cromeros',
  array(select generate_series(1496, 1631)),
  array['fluor','holo'],
  array['Rojo','Amarillo','Naranja','Verde','Rosa'],
  array['Plateado opaco','Amarillo','Rojo','Azul','Verde','Celeste','Naranja']
);

select public.seed_catalog_variants(
  'cromeros',
  array[1632,1633,1634,1637,1638,1639,1642,1643,1644,1647,1648,1649,1652,1653,1654,1657,1658,1659,1662,1663,1664,1667,1668,1669,1681,1682,1683,1693,1694,1695,1705,1706,1707,1717,1718,1719,1729,1730,1731,1741,1742],
  array['fluor','holo'],
  array['Amarillo','Naranja','Verde','Rosa'],
  array['Verde','Violeta','Celeste','Rojo','Bronce']
);

select public.seed_catalog_variants(
  'cromeros',
  array[1761,1762,1763,1764,1765,1766,1767,1768,1769,1771,1772,1773,1776,1777,1780,1781,1782,1784,1785,1788,1789,1791,1792,1793,1796,1797,1798,1799,1802,1803,1810,1811,1812,1813,1822,1823,1824,1830,1834,1835,1836,1839,1845,1846,1847,1848],
  array['fluor','holo'],
  array['Amarillo','Naranja','Verde','Rosa'],
  array['Verde','Violeta','Celeste','Rojo','Plateado','Azul','Patrones','Bronce']
);

select public.seed_catalog_variants(
  'cromeros',
  array[1850,1858,1859,1860,1868,1870,1871,1872,1875,1879,1882,1883,1884,1894,1895,1896,1897,1898,1899,1900,1901,1902,1903,1904,1905,1907,1908,1909,1912,1913,1916,1917,1918,1920,1921,1924,1925,1927,1928,1929,1932,1933,1934,1935],
  array['fluor','holo'],
  array['Amarillo','Naranja','Verde','Rosa'],
  array['Verde','Violeta','Celeste','Rojo','Plateado','Azul','Patrones','Bronce']
);

-- Make duplicate prints loadable as common Base.
insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
select id, 'comun', 'Base', 10
from public.catalog_cards
where collection = 'cromeros'
  and print_key in ('error', 'corregida', 'fantasma')
on conflict (catalog_card_id, variant_type, color_variant) do nothing;

drop function if exists public.seed_catalog_variants(text, integer[], text[], text[], text[]);

update public.stock_cards sc
set catalog_card_id = cc.id
from public.catalog_cards cc
where sc.catalog_card_id is null
  and sc.collection = cc.collection
  and sc.card_number = cc.card_number
  and sc.expansion = cc.expansion
  and cc.print_key = 'base';

alter table public.catalog_cards enable row level security;
alter table public.catalog_card_variants enable row level security;

drop policy if exists "Public can read active catalog cards" on public.catalog_cards;
create policy "Public can read active catalog cards"
on public.catalog_cards
for select
using (active = true);

drop policy if exists "Public can read active catalog variants" on public.catalog_card_variants;
create policy "Public can read active catalog variants"
on public.catalog_card_variants
for select
using (
  active = true
  and exists (
    select 1
    from public.catalog_cards cc
    where cc.id = catalog_card_variants.catalog_card_id
      and cc.active = true
  )
);

grant select on public.catalog_cards to anon, authenticated;
grant select on public.catalog_card_variants to anon, authenticated;

select
  (select count(*) from public.catalog_cards where collection = 'cromeros') as cromeros_cards,
  (select count(*) from public.catalog_card_variants ccv join public.catalog_cards cc on cc.id = ccv.catalog_card_id where cc.collection = 'cromeros') as cromeros_variants,
  (select count(*) from public.stock_cards where catalog_card_id is not null) as stock_cards_linked;
