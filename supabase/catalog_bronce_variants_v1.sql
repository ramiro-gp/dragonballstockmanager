-- Adds the Bronce holo color to the Cromeros expansions where it is valid.
-- Safe to run more than once: on conflict does nothing.

with target_cards as (
  select cc.id, cc.card_number
  from public.catalog_cards cc
  where cc.collection = 'cromeros'
    and (
      (cc.expansion = 'Guerreros Legendarios 1' and cc.card_number in (
        1088,1090,1091,1092,1093,1094,1098,1099,1110,1111,1112,1113,
        1123,1125,1126,1127,1129,1131,1134,1146,1147,1148,1149,
        1157,1161,1162,1167,1169,1170,1181,1182,1183,1184,
        1197,1199,1204,1207,1214,1222,1223
      ))
      or (cc.expansion = 'Guerreros Legendarios 2' and cc.card_number in (
        1225,1226,1236,1239,1244,1245,1246,1248,1249,1251,1254,
        1259,1260,1261,1262,1263,1272,1275,1276,1278,1280,1284,
        1291,1298,1299,1309,1320,1322,1326,1329,1334,1338,1339,
        1341,1348,1350,1354,1355,1359
      ))
      or (cc.expansion = 'GT' and cc.card_number in (
        1632,1633,1634,1637,1638,1639,1642,1643,1644,
        1647,1648,1649,1652,1653,1654,1657,1658,1659,
        1662,1663,1664,1667,1668,1669,1681,1682,1683,
        1693,1694,1695,1705,1706,1707,1717,1718,1719,
        1729,1730,1731,1741,1742
      ))
      or (cc.expansion = 'Batalla Final 1' and cc.card_number in (
        1761,1762,1763,1764,1765,1766,1767,1768,1769,
        1771,1772,1773,1776,1777,1780,1781,1782,
        1784,1785,1788,1789,1791,1792,1793,1796,1797,1798,1799,
        1802,1803,1810,1811,1812,1813,1822,1823,1824,1830,
        1834,1835,1836,1839,1845,1846,1847,1848
      ))
      or (cc.expansion = 'Batalla Final 2' and cc.card_number in (
        1850,1858,1859,1860,1868,1870,1871,1872,1875,
        1879,1882,1883,1884,1894,1895,1896,1897,1898,1899,
        1900,1901,1902,1903,1904,1905,1907,1908,1909,1912,1913,
        1916,1917,1918,1920,1921,1924,1925,1927,1928,1929,
        1932,1933,1934,1935
      ))
    )
)
insert into public.catalog_card_variants (catalog_card_id, variant_type, color_variant, sort_order)
select id, 'holo', 'Bronce', 90
from target_cards
on conflict (catalog_card_id, variant_type, color_variant) do nothing;

select
  'catalog_bronce_variants_v1 ready' as status,
  count(*) as bronce_holo_variants
from public.catalog_card_variants ccv
join public.catalog_cards cc on cc.id = ccv.catalog_card_id
where cc.collection = 'cromeros'
  and ccv.variant_type = 'holo'
  and ccv.color_variant = 'Bronce'
  and cc.expansion in ('Guerreros Legendarios 1', 'Guerreros Legendarios 2', 'GT', 'Batalla Final 1', 'Batalla Final 2');
