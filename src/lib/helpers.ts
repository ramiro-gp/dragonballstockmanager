import type { CardKind, CardStock, CartLine, Product, Sale, SaleStatus } from "./types";

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

export const formatWhatsappMoney = (value: number) =>
  `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value)}`;

export const kindLabel: Record<CardKind, string> = {
  comun: "Común",
  fluor: "Fluor",
  holo: "Holo",
};

export const statusLabel: Record<SaleStatus, string> = {
  pendiente: "Pendiente",
  reservada: "Reservada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

export function parseCardList(input: string) {
  return input
    .toUpperCase()
    .replace(/[,\n\t]+/g, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => /^\d+F?$/.test(token));
}

export function parseRange(from: string, to: string, except: string) {
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const blocked = new Set(parseCardList(except));
  return Array.from({ length: high - low + 1 }, (_, index) => String(low + index)).filter(
    (number) => !blocked.has(number),
  );
}

export function groupNumbers(numbers: string[]) {
  return numbers.reduce<Record<string, number>>((acc, number) => {
    acc[number] = (acc[number] ?? 0) + 1;
    return acc;
  }, {});
}

export function availableQuantity(item: CardStock) {
  return Math.max(0, item.quantity - item.reserved);
}

export function availableProductQuantity(item: Product) {
  return Math.max(0, item.quantity - item.reserved);
}

export function saleTotal(sale: Sale) {
  return sale.lines.reduce((sum, line) => sum + line.finalUnitPrice * line.quantity, 0);
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function paidTotal(sale: Sale) {
  return sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export function shouldApplyStock(status: SaleStatus) {
  return saleInventoryState(status) !== "none";
}

export function saleInventoryState(status: SaleStatus) {
  if (status === "reservada") return "reserved";
  if (status === "confirmada") return "sold";
  return "none";
}

export function buildWhatsappUrl(phone: string, sellerName: string, order: string, lines: CartLine[], note: string) {
  const list = lines
    .map((line) => `- ${line.label} x${line.quantity}: ${formatWhatsappMoney(line.unitPrice * line.quantity)}`)
    .join("\n");
  const message = `Hola ${sellerName}, me gustaría comprar estas cartas/productos:\n\nPedido ${order}\n${list}\n\nTotal: ${formatWhatsappMoney(
    cartTotal(lines),
  )}${note ? `\n\nNota: ${note}` : ""}`;

  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
