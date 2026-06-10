import type { CardKind } from "../lib/types";

type ExpansionRule = {
  label: string;
  from: number;
  to: number;
};

type VariantRule = {
  kinds: CardKind[];
  fluor: string[];
  holo: string[];
};

export type VariantDraft = {
  key: string;
  number: string;
  kind: CardKind;
  variant: string;
  quantity: number;
  price: number;
};

export const CROMEROS_EXPANSIONS: ExpansionRule[] = [
  { label: "1", from: 1, to: 129 },
  { label: "2", from: 130, to: 265 },
  { label: "3", from: 266, to: 401 },
  { label: "Ocultas", from: 402, to: 403 },
  { label: "4", from: 408, to: 543 },
  { label: "5", from: 544, to: 679 },
  { label: "6", from: 680, to: 815 },
  { label: "Personajes", from: 816, to: 951 },
  { label: "7", from: 952, to: 1087 },
  { label: "Guerreros 1", from: 1088, to: 1223 },
  { label: "Guerreros 2", from: 1224, to: 1359 },
  { label: "Super Batalla 1", from: 1360, to: 1495 },
  { label: "Super Batalla 2", from: 1496, to: 1631 },
  { label: "GT", from: 1632, to: 1760 },
  { label: "Batalla Final 1", from: 1761, to: 1848 },
  { label: "Batalla Final 2", from: 1849, to: 1936 },
];

const holographicByExpansion: Record<string, number[]> = {
  Personajes: [816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 868, 869, 870, 871, 872, 880, 881, 882, 883, 884, 887, 892, 893, 894, 895, 896, 904, 905, 906, 907, 908, 916, 917, 918, 919, 920, 928, 929, 930, 931, 932, 940, 941, 942, 943, 944],
  "7": [953, 954, 957, 958, 963, 968, 969, 970, 972, 973, 975, 977, 984, 988, 989, 991, 993, 994, 997, 1006, 1008, 1010, 1019, 1027, 1028, 1029, 1036, 1037, 1038, 1051, 1053, 1055, 1056, 1058, 1065, 1069, 1076, 1078, 1080, 1084],
  "Guerreros 1": [1088, 1090, 1091, 1092, 1093, 1094, 1098, 1099, 1110, 1111, 1112, 1113, 1123, 1125, 1126, 1127, 1129, 1131, 1134, 1146, 1147, 1148, 1149, 1157, 1161, 1162, 1167, 1169, 1170, 1181, 1182, 1183, 1184, 1197, 1199, 1204, 1207, 1214, 1222, 1223],
  "Guerreros 2": [1225, 1226, 1236, 1239, 1244, 1245, 1246, 1248, 1249, 1251, 1254, 1259, 1260, 1261, 1262, 1263, 1272, 1275, 1276, 1278, 1280, 1284, 1291, 1298, 1299, 1309, 1320, 1322, 1326, 1329, 1334, 1338, 1339, 1341, 1348, 1350, 1354, 1355, 1359],
  "Super Batalla 1": range(1360, 1495),
  "Super Batalla 2": range(1496, 1631),
  GT: [1632, 1633, 1634, 1637, 1638, 1639, 1642, 1643, 1644, 1647, 1648, 1649, 1652, 1653, 1654, 1657, 1658, 1659, 1662, 1663, 1664, 1667, 1668, 1669, 1681, 1682, 1683, 1693, 1694, 1695, 1705, 1706, 1707, 1717, 1718, 1719, 1729, 1730, 1731, 1741, 1742],
  "Batalla Final 1": [1761, 1762, 1763, 1764, 1765, 1766, 1767, 1768, 1769, 1771, 1772, 1773, 1776, 1777, 1780, 1781, 1782, 1784, 1785, 1788, 1789, 1791, 1792, 1793, 1796, 1797, 1798, 1799, 1802, 1803, 1810, 1811, 1812, 1813, 1822, 1823, 1824, 1830, 1834, 1835, 1836, 1839, 1845, 1846, 1847, 1848],
  "Batalla Final 2": [1850, 1858, 1859, 1860, 1868, 1870, 1871, 1872, 1875, 1879, 1882, 1883, 1884, 1894, 1895, 1896, 1897, 1898, 1899, 1900, 1901, 1902, 1903, 1904, 1905, 1907, 1908, 1909, 1912, 1913, 1916, 1917, 1918, 1920, 1921, 1924, 1925, 1927, 1928, 1929, 1932, 1933, 1934, 1935],
};

const variantRules: Record<string, VariantRule> = {
  Personajes: {
    kinds: ["comun", "fluor", "holo"],
    fluor: ["Fluor"],
    holo: ["Dorado", "Plateado", "Dorado opaco", "Plateado opaco", "Rojo", "Azul", "Verde", "Violeta", "Amarillo", "Bronce", "Patrones", "Arcoiris", "Tornasolado"],
  },
  "7": {
    kinds: ["comun", "holo"],
    fluor: [],
    holo: ["Dorado", "Plateado", "Dorado opaco", "Plateado opaco", "Rojo", "Azul", "Verde", "Violeta", "Amarillo", "Bronce", "Naranja"],
  },
  "Guerreros 1": {
    kinds: ["comun", "holo"],
    fluor: [],
    holo: ["Patrones", "Rojo", "Amarillo", "Plateado", "Verde", "Azul", "Violeta", "Turquesa"],
  },
  "Guerreros 2": {
    kinds: ["fluor", "holo"],
    fluor: ["Rosa", "Naranja", "Verde"],
    holo: ["Rojo", "Azul", "Verde", "Amarillo", "Turquesa", "Violeta"],
  },
  "Super Batalla 1": {
    kinds: ["fluor", "holo"],
    fluor: ["Rojo", "Amarillo", "Naranja", "Verde", "Rosa"],
    holo: ["Plateado opaco", "Amarillo", "Rojo", "Azul", "Verde", "Celeste", "Naranja"],
  },
  "Super Batalla 2": {
    kinds: ["fluor", "holo"],
    fluor: ["Rojo", "Amarillo", "Naranja", "Verde", "Rosa"],
    holo: ["Plateado opaco", "Amarillo", "Rojo", "Azul", "Verde", "Celeste", "Naranja"],
  },
  GT: {
    kinds: ["fluor", "holo"],
    fluor: ["Amarillo", "Naranja", "Verde", "Rosa"],
    holo: ["Verde", "Violeta", "Celeste", "Rojo"],
  },
  "Batalla Final 1": {
    kinds: ["fluor", "holo"],
    fluor: ["Amarillo", "Naranja", "Verde", "Rosa"],
    holo: ["Verde", "Violeta", "Celeste", "Rojo", "Plateado", "Azul", "Patrones"],
  },
  "Batalla Final 2": {
    kinds: ["fluor", "holo"],
    fluor: ["Amarillo", "Naranja", "Verde", "Rosa"],
    holo: ["Verde", "Violeta", "Celeste", "Rojo", "Plateado", "Azul", "Patrones"],
  },
};

export function getCromerosExpansion(cardNumber: string) {
  const number = Number(cardNumber.replace(/\D/g, ""));
  const expansion = CROMEROS_EXPANSIONS.find((item) => number >= item.from && number <= item.to);
  return expansion?.label ?? "Sin expansión";
}

export function getVariantRule(cardNumber: string): VariantRule | undefined {
  const expansion = getCromerosExpansion(cardNumber);
  const number = Number(cardNumber.replace(/\D/g, ""));
  if (!holographicByExpansion[expansion]?.includes(number)) return undefined;
  return variantRules[expansion];
}

export function needsVariantChoice(cardNumber: string) {
  return Boolean(getVariantRule(cardNumber));
}

export function getKindOptions(cardNumber: string): CardKind[] {
  return getVariantRule(cardNumber)?.kinds ?? ["comun"];
}

export function getColorOptions(cardNumber: string, kind: CardKind) {
  if (kind === "comun") return ["Base"];
  const rule = getVariantRule(cardNumber);
  if (!rule) return kind === "fluor" ? ["Fluor"] : ["Base"];
  return kind === "fluor" ? rule.fluor : rule.holo;
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
