import type { CardStock } from "./types";

export function cardNumberValue(value: string) {
  return Number(value.replace(/\D/g, ""));
}

export function sortCardStock(a: CardStock, b: CardStock) {
  return cardNumberValue(a.number) - cardNumberValue(b.number) || a.variant.localeCompare(b.variant);
}
