import type { CardStock, Product, Purchase, Sale, Seller } from "../lib/types";

const mainSellerWhatsapp = import.meta.env.VITE_MAIN_SELLER_WHATSAPP || "+5491100000000";

export const sellers: Seller[] = [
  {
    id: "seller-ramiro",
    name: "ramitagarcia",
    slug: "ramitagarcia",
    whatsapp: mainSellerWhatsapp,
    role: "admin",
    isMain: true,
    status: "active",
    memberSince: "2026-06-01",
    subscriptionUntil: "2026-07-09",
    subscriptionPlan: "owner",
    shippingEnabled: true,
    shippingCompanies: ["Correo Argentino", "Mercado Libre"],
    location: "CABA",
  },
];

export const initialPurchases: Purchase[] = [];
export const initialStock: CardStock[] = [];
export const initialProducts: Product[] = [];
export const initialSales: Sale[] = [];
