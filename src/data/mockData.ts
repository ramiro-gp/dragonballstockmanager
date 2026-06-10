import type { CardStock, Product, Sale, Seller } from "../lib/types";

const mainSellerWhatsapp = import.meta.env.VITE_MAIN_SELLER_WHATSAPP || "+5491100000000";
const secondarySellerWhatsapp = import.meta.env.VITE_SECONDARY_SELLER_WHATSAPP || "+5491100000001";

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
  },
  {
    id: "seller-capsule",
    name: "Capsule Cards",
    slug: "capsule-cards",
    whatsapp: secondarySellerWhatsapp,
    role: "seller",
    isMain: false,
    status: "inactive",
    memberSince: "2026-05-09",
    subscriptionUntil: "2026-05-09",
    subscriptionPlan: "monthly",
    shippingEnabled: false,
    shippingCompanies: [],
  },
];

export const initialPurchases = [
  {
    id: "purchase-1",
    sellerId: "seller-ramiro",
    date: "2026-06-01",
    source: "Lote zona oeste",
    totalSpent: 42000,
    totalCards: 500,
    commonCount: 360,
    fluorCount: 90,
    holoCount: 50,
    topExpansion: "Guerreros 2",
  },
  {
    id: "purchase-2",
    sellerId: "seller-ramiro",
    date: "2026-06-06",
    source: "Colección GT",
    totalSpent: 28000,
    totalCards: 180,
    commonCount: 130,
    fluorCount: 30,
    holoCount: 20,
    topExpansion: "GT",
  },
];

export const initialStock: CardStock[] = [
  { id: "c-1110-comun", sellerId: "seller-ramiro", number: "1110", expansion: "Guerreros Legendarios 2", kind: "comun", variant: "Base", quantity: 1, reserved: 0, price: 3000 },
  { id: "c-1110-verde", sellerId: "seller-ramiro", number: "1110", expansion: "Guerreros Legendarios 2", kind: "holo", variant: "Verde", quantity: 3, reserved: 1, price: 5000 },
  { id: "c-1134-glitter", sellerId: "seller-ramiro", number: "1134", expansion: "Guerreros Legendarios 2", kind: "holo", variant: "Glitter", quantity: 2, reserved: 0, price: 1500 },
  { id: "c-1275-fluor", sellerId: "seller-ramiro", number: "1275", expansion: "Super Batalla 1", kind: "fluor", variant: "Fluor", quantity: 5, reserved: 0, price: 700 },
  { id: "c-504f", sellerId: "seller-ramiro", number: "504F", expansion: "Secretas Fantasma", kind: "comun", variant: "Fantasma", quantity: 1, reserved: 0, price: 4500, special: "fantasma" },
  { id: "c-900-comun", sellerId: "seller-ramiro", number: "900", expansion: "GT", kind: "comun", variant: "Base", quantity: 4, reserved: 0, price: 700 },
  { id: "c-221-azul", sellerId: "seller-ramiro", number: "221", expansion: "Expansión 1", kind: "holo", variant: "Azul", quantity: 1, reserved: 0, price: 2200 },
  { id: "c-300-comun", sellerId: "seller-ramiro", number: "300", expansion: "Expansión 1", kind: "comun", variant: "Base", quantity: 8, reserved: 0, price: 300 },
  { id: "c-301-comun", sellerId: "seller-ramiro", number: "301", expansion: "Expansión 1", kind: "comun", variant: "Base", quantity: 6, reserved: 0, price: 300 },
  { id: "c-302-comun", sellerId: "seller-ramiro", number: "302", expansion: "Expansión 1", kind: "comun", variant: "Base", quantity: 4, reserved: 0, price: 300 },
  { id: "c-capsule-700", sellerId: "seller-capsule", number: "700", expansion: "GT", kind: "holo", variant: "Dorado", quantity: 2, reserved: 0, price: 1900 },
  { id: "c-capsule-701", sellerId: "seller-capsule", number: "701", expansion: "GT", kind: "comun", variant: "Base", quantity: 5, reserved: 0, price: 450 },
];

export const initialProducts: Product[] = [
  {
    id: "p-shenlong",
    sellerId: "seller-ramiro",
    name: "Figura Shenlong",
    category: "figura",
    description: "Figura de colección en caja, ideal para vitrina.",
    quantity: 0,
    price: 18000,
    imageUrl: "https://images.unsplash.com/photo-1608889476561-6242cfdbf622?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p-posters-z",
    sellerId: "seller-ramiro",
    name: "Lote posters Dragon Ball Z",
    category: "lote",
    description: "Set de posters chicos para completar colección o decorar carpeta.",
    quantity: 3,
    price: 8500,
    imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p-caja-gt",
    sellerId: "seller-ramiro",
    name: "Caja Cromeros GT con cartas",
    category: "caja",
    description: "Caja con cartas incluidas. No descuenta stock individual.",
    quantity: 2,
    price: 24000,
    imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p-capsule-tomo",
    sellerId: "seller-capsule",
    name: "Tomo Dragon Ball usado",
    category: "tomo",
    description: "Tomo en buen estado publicado por Capsule Cards.",
    quantity: 1,
    price: 6200,
    imageUrl: "https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=900&q=80",
  },
];

export const initialSales: Sale[] = [
  {
    id: "sale-1",
    orderNumber: "DBSM-2401",
    sellerId: "seller-ramiro",
    customerName: "Mati",
    customerWhatsapp: "+5491122222222",
    note: "Quiere retirar el sábado.",
    status: "reservada",
    stockApplied: true,
    createdAt: "2026-06-02",
    shippingPending: true,
    lines: [
      { itemType: "card", itemId: "c-1110-verde", sellerId: "seller-ramiro", label: "Carta 1110 · Holo Verde", unitPrice: 5000, finalUnitPrice: 5000, quantity: 1, maxQuantity: 3 },
      { itemType: "card", itemId: "c-1275-fluor", sellerId: "seller-ramiro", label: "Carta 1275 · Fluor", unitPrice: 700, finalUnitPrice: 700, quantity: 2, maxQuantity: 5 },
    ],
    payments: [{ id: "pay-1", amount: 1280, note: "Seña 20%", date: "2026-06-02" }],
  },
  {
    id: "sale-2",
    orderNumber: "DBSM-2402",
    sellerId: "seller-ramiro",
    customerName: "Sofi",
    status: "confirmada",
    stockApplied: true,
    createdAt: "2026-06-05",
    shippingPending: false,
    lines: [
      { itemType: "card", itemId: "c-1134-glitter", sellerId: "seller-ramiro", label: "Carta 1134 · Holo Glitter", unitPrice: 1500, finalUnitPrice: 1300, quantity: 1, maxQuantity: 2 },
      { itemType: "product", itemId: "p-shenlong", sellerId: "seller-ramiro", label: "Figura Shenlong", unitPrice: 18000, finalUnitPrice: 18000, quantity: 1, maxQuantity: 1 },
    ],
    payments: [{ id: "pay-2", amount: 19300, note: "Pago completo", date: "2026-06-05" }],
  },
];
