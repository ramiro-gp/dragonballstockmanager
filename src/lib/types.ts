export type CardKind = "comun" | "fluor" | "holo";
export type SaleStatus = "pendiente" | "reservada" | "confirmada" | "cancelada";
export type Theme = "light" | "dark";

export type Seller = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  role: "admin" | "seller";
  isMain: boolean;
  status: "active" | "inactive";
  memberSince: string;
  subscriptionUntil: string;
  subscriptionPlan: "monthly" | "quarterly" | "semester" | "lifetime" | "owner";
  shippingEnabled: boolean;
  shippingCompanies: string[];
};

export type Purchase = {
  id: string;
  sellerId: string;
  date: string;
  source: string;
  totalSpent: number;
  totalCards: number;
  commonCount: number;
  fluorCount: number;
  holoCount: number;
  topExpansion: string;
};

export type CardStock = {
  id: string;
  sellerId: string;
  number: string;
  expansion: string;
  kind: CardKind;
  variant: string;
  quantity: number;
  reserved: number;
  price: number;
  special?: "fantasma" | "error";
};

export type Product = {
  id: string;
  sellerId: string;
  name: string;
  category: "figura" | "tomo" | "caja" | "lote" | "figurita";
  description: string;
  quantity: number;
  price: number;
  imageUrl: string;
};

export type CartLine = {
  itemType: "card" | "product";
  itemId: string;
  sellerId: string;
  label: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
};

export type SaleLine = CartLine & {
  finalUnitPrice: number;
};

export type Payment = {
  id: string;
  amount: number;
  note: string;
  date: string;
};

export type Sale = {
  id: string;
  orderNumber: string;
  sellerId: string;
  customerName: string;
  customerWhatsapp?: string;
  note?: string;
  status: SaleStatus;
  stockApplied: boolean;
  createdAt: string;
  lines: SaleLine[];
  payments: Payment[];
  shippingPending: boolean;
};
