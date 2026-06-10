import { useEffect, useState } from "react";
import clsx from "clsx";
import { getCurrentRoute, privateRoutes, type Route } from "./app/routes";
import { AppLayout } from "./components/layout/AppLayout";
import { initialProducts, initialPurchases, initialSales, initialStock, sellers } from "./data/mockData";
import { cartTotal, saleTotal, shouldApplyStock } from "./lib/helpers";
import { supabase } from "./lib/supabase";
import type { CardKind, CardStock, CartLine, Product, PublishCardInput, PublishProductInput, Purchase, Sale, SaleLine, SaleStatus, Seller, SellerSettings, Theme } from "./lib/types";
import { CartPage } from "./pages/CartPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { CreateSellerPage } from "./pages/CreateSellerPage";
import { PublicStockPage } from "./pages/PublicStockPage";
import { SalesPage } from "./pages/SalesPage";
import { SellPage } from "./pages/SellPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StockManagementPage } from "./pages/StockManagementPage";
import { StockManagerPage } from "./pages/StockManagerPage";
import { SubscriptionExpiredPage } from "./pages/SubscriptionExpiredPage";

const fallbackSeller = sellers[0];
const fallbackSellerId = fallbackSeller.id;
const fallbackSellerSettings: SellerSettings = {
  defaultCommonPrice: 400,
  defaultFluorPrice: 700,
  defaultHoloPrice: 2000,
  paymentAlias: "",
  paymentCvu: "",
};
const STORAGE_KEYS = {
  theme: "dbsm.theme",
  sidebarCollapsed: "dbsm.sidebarCollapsed",
  currentSeller: "dbsm.currentSeller",
  stock: "dbsm.stock",
  products: "dbsm.products",
  sales: "dbsm.sales",
  cart: "dbsm.cart",
} as const;

export function App() {
  const [theme, setTheme] = useState<Theme>(() => readStorage(STORAGE_KEYS.theme, "dark"));
  const [route, setRoute] = useState<Route>(getCurrentRoute());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState("");
  const [currentSeller, setCurrentSeller] = useState<Seller>(() => readStorage(STORAGE_KEYS.currentSeller, fallbackSeller));
  const [sellerDirectory, setSellerDirectory] = useState<Seller[]>(() => upsertMainSeller(sellers, readStorage(STORAGE_KEYS.currentSeller, fallbackSeller)));
  const [sellerSettings, setSellerSettings] = useState<SellerSettings>(fallbackSellerSettings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readStorage(STORAGE_KEYS.sidebarCollapsed, false));
  const [stock, setStock] = useState<CardStock[]>(() => readStorage(STORAGE_KEYS.stock, initialStock));
  const [products, setProducts] = useState<Product[]>(() => readStorage(STORAGE_KEYS.products, initialProducts));
  const [sales, setSales] = useState<Sale[]>(() => readStorage(STORAGE_KEYS.sales, initialSales));
  const [purchases] = useState<Purchase[]>(initialPurchases);
  const [cart, setCart] = useState<CartLine[]>(() => readStorage(STORAGE_KEYS.cart, []));

  const publicSeller = getPublicSeller(route, sellerDirectory) ?? currentSeller;
  const sellerStock = stock.filter((item) => item.sellerId === currentSeller.id);
  const sellerProducts = products.filter((item) => item.sellerId === currentSeller.id);
  const publicSellerStock = stock.filter((item) => item.sellerId === publicSeller.id);
  const publicSellerProducts = products.filter((item) => item.sellerId === publicSeller.id && item.quantity > 0);
  const sellerSales = sales.filter((sale) => sale.sellerId === currentSeller.id);
  const sellerPurchases = purchases.filter((purchase) => purchase.sellerId === currentSeller.id);
  const cartSeller = sellerDirectory.find((seller) => seller.id === cart[0]?.sellerId) ?? publicSeller;
  const revenue = sellerSales.filter((sale) => sale.status === "confirmada").reduce((sum, sale) => sum + saleTotal(sale), 0);
  const spent = sellerPurchases.reduce((sum, purchase) => sum + purchase.totalSpent, 0);
  const visibleRoute = !isLoggedIn && privateRoutes.includes(route) ? "/login" : route;
  const sellerInactive = isLoggedIn && currentSeller.status === "inactive";

  useEffect(() => {
    const onPopState = () => setRoute(getCurrentRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setIsLoggedIn(Boolean(session));
      setAuthLoading(false);
      if (session) void loadSellerFromSupabase(session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
      setAuthLoading(false);
      if (session) {
        void loadSellerFromSupabase(session.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => writeStorage(STORAGE_KEYS.theme, theme), [theme]);
  useEffect(() => writeStorage(STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed), [sidebarCollapsed]);
  useEffect(() => writeStorage(STORAGE_KEYS.currentSeller, currentSeller), [currentSeller]);
  useEffect(() => writeStorage(STORAGE_KEYS.stock, stock), [stock]);
  useEffect(() => writeStorage(STORAGE_KEYS.products, products), [products]);
  useEffect(() => writeStorage(STORAGE_KEYS.sales, sales), [sales]);
  useEffect(() => writeStorage(STORAGE_KEYS.cart, cart), [cart]);

  function navigate(nextRoute: Route) {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
  }

  async function loadSellerFromSupabase(userId: string) {
    if (!supabase) return;

    const { data: sellerData, error: sellerError } = await supabase
      .from("sellers")
      .select("id, slug, display_name, whatsapp, role, active, created_at")
      .eq("id", userId)
      .single();

    if (sellerError || !sellerData) {
      setAuthError("Tu usuario existe, pero no encontré su perfil de vendedor.");
      return;
    }

    const supabaseSeller = mapSupabaseSeller(sellerData);
    setCurrentSeller(supabaseSeller);
    setSellerDirectory((current) => upsertMainSeller(current, supabaseSeller));
    normalizeLocalSellerId(fallbackSellerId, supabaseSeller.id);

    const { data: settingsData } = await supabase
      .from("seller_settings")
      .select("default_common_price_ars, default_fluor_price_ars, default_holo_price_ars, payment_alias, payment_cvu")
      .eq("seller_id", userId)
      .maybeSingle();

    if (settingsData) {
      setSellerSettings({
        defaultCommonPrice: settingsData.default_common_price_ars ?? fallbackSellerSettings.defaultCommonPrice,
        defaultFluorPrice: settingsData.default_fluor_price_ars ?? fallbackSellerSettings.defaultFluorPrice,
        defaultHoloPrice: settingsData.default_holo_price_ars ?? fallbackSellerSettings.defaultHoloPrice,
        paymentAlias: settingsData.payment_alias ?? "",
        paymentCvu: settingsData.payment_cvu ?? "",
      });
    }

    await loadSellerInventoryFromSupabase(userId);
  }

  async function loadSellerInventoryFromSupabase(sellerId: string) {
    if (!supabase) return;

    const [{ data: cardRows }, { data: productRows }] = await Promise.all([
      supabase
        .from("stock_cards")
        .select("id, seller_id, card_number, expansion, variant_type, color_variant, quantity, reserved, price_ars")
        .eq("seller_id", sellerId)
        .order("card_number", { ascending: true }),
      supabase
        .from("stock_products")
        .select("id, seller_id, category, product_name, description, image_url, quantity, reserved, price_ars, active")
        .eq("seller_id", sellerId)
        .order("product_name", { ascending: true }),
    ]);

    if (cardRows?.length) {
      const nextCards = cardRows.map(mapSupabaseCard);
      setStock((current) => [
        ...current.filter((item) => item.sellerId !== sellerId && item.sellerId !== fallbackSellerId),
        ...nextCards,
      ]);
    }

    if (productRows?.length) {
      const nextProducts = productRows.map(mapSupabaseProduct);
      setProducts((current) => [
        ...current.filter((item) => item.sellerId !== sellerId && item.sellerId !== fallbackSellerId),
        ...nextProducts,
      ]);
    }
  }

  async function publishCardsToSupabase(rows: PublishCardInput[]) {
    if (!supabase) return null;

    for (const row of rows) {
      const cardNumber = Number.parseInt(row.number, 10);
      if (!Number.isFinite(cardNumber)) continue;

      const { data: existing } = await supabase
        .from("stock_cards")
        .select("id, quantity")
        .eq("seller_id", currentSeller.id)
        .eq("collection", "cromeros")
        .eq("card_number", cardNumber)
        .eq("expansion", row.expansion)
        .eq("variant_type", row.kind)
        .eq("color_variant", row.variant)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("stock_cards")
          .update({
            quantity: (existing.quantity ?? 0) + row.quantity,
            price_ars: row.price,
          })
          .eq("id", existing.id);
        continue;
      }

      await supabase.from("stock_cards").insert({
        seller_id: currentSeller.id,
        collection: "cromeros",
        card_number: cardNumber,
        expansion: row.expansion,
        variant_type: row.kind,
        color_variant: row.variant,
        quantity: row.quantity,
        reserved: 0,
        price_ars: row.price,
      });
    }

    const { data: cardRows } = await supabase
      .from("stock_cards")
      .select("id, seller_id, card_number, expansion, variant_type, color_variant, quantity, reserved, price_ars")
      .eq("seller_id", currentSeller.id)
      .order("card_number", { ascending: true });

    const nextCards = cardRows?.map(mapSupabaseCard) ?? [];
    setStock((current) => [
      ...current.filter((item) => item.sellerId !== currentSeller.id && item.sellerId !== fallbackSellerId),
      ...nextCards,
    ]);
    return nextCards;
  }

  async function publishProductToSupabase(product: PublishProductInput) {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("stock_products")
      .insert({
        seller_id: currentSeller.id,
        category: product.category,
        product_name: product.name,
        description: product.description,
        image_url: product.imageUrl,
        quantity: product.quantity,
        reserved: 0,
        price_ars: product.price,
        active: true,
      })
      .select("id, seller_id, category, product_name, description, image_url, quantity, reserved, price_ars, active")
      .single();

    if (error || !data) return null;
    return mapSupabaseProduct(data);
  }

  async function saveManagedCardsToSupabase(rows: CardStock[]) {
    if (!supabase) return null;

    await supabase.from("stock_cards").delete().eq("seller_id", currentSeller.id);

    const rowsToInsert = rows
      .map((row) => ({
        seller_id: currentSeller.id,
        collection: "cromeros",
        card_number: Number.parseInt(row.number, 10),
        expansion: row.expansion,
        variant_type: row.kind,
        color_variant: row.variant,
        quantity: row.quantity,
        reserved: row.reserved,
        price_ars: row.price,
      }))
      .filter((row) => Number.isFinite(row.card_number));

    if (rowsToInsert.length) {
      await supabase.from("stock_cards").insert(rowsToInsert);
    }

    const { data: cardRows } = await supabase
      .from("stock_cards")
      .select("id, seller_id, card_number, expansion, variant_type, color_variant, quantity, reserved, price_ars")
      .eq("seller_id", currentSeller.id)
      .order("card_number", { ascending: true });

    return cardRows?.map(mapSupabaseCard) ?? [];
  }

  async function saveManagedProductsToSupabase(rows: Product[]) {
    if (!supabase) return null;

    await supabase.from("stock_products").delete().eq("seller_id", currentSeller.id);

    const rowsToInsert = rows.map((row) => ({
      seller_id: currentSeller.id,
      category: row.category,
      product_name: row.name,
      description: row.description,
      image_url: row.imageUrl,
      quantity: row.quantity,
      reserved: 0,
      price_ars: row.price,
      active: true,
    }));

    if (rowsToInsert.length) {
      await supabase.from("stock_products").insert(rowsToInsert);
    }

    const { data: productRows } = await supabase
      .from("stock_products")
      .select("id, seller_id, category, product_name, description, image_url, quantity, reserved, price_ars, active")
      .eq("seller_id", currentSeller.id)
      .order("product_name", { ascending: true });

    return productRows?.map(mapSupabaseProduct) ?? [];
  }

  function normalizeLocalSellerId(fromSellerId: string, toSellerId: string) {
    if (fromSellerId === toSellerId) return;

    setStock((current) => current.map((item) => item.sellerId === fromSellerId ? { ...item, sellerId: toSellerId } : item));
    setProducts((current) => current.map((item) => item.sellerId === fromSellerId ? { ...item, sellerId: toSellerId } : item));
    setSales((current) =>
      current.map((sale) =>
        sale.sellerId === fromSellerId
          ? {
              ...sale,
              sellerId: toSellerId,
              lines: sale.lines.map((line) => line.sellerId === fromSellerId ? { ...line, sellerId: toSellerId } : line),
            }
          : sale,
      ),
    );
    setCart((current) => current.map((line) => line.sellerId === fromSellerId ? { ...line, sellerId: toSellerId } : line));
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/");
  }

  function addToCart(line: CartLine) {
    setCart((current) => mergeCartLines(current, [line]));
  }

  function addManyToCart(lines: CartLine[]) {
    setCart((current) => mergeCartLines(current, lines));
  }

  function createPendingSale(customerName: string, customerWhatsapp: string, note: string, orderNumber: string) {
    if (!cart.length) return;
    const sale: Sale = {
      id: crypto.randomUUID(),
      orderNumber,
      sellerId: cart[0]?.sellerId ?? currentSeller.id,
      customerName: customerName || "Cliente sin nombre",
      customerWhatsapp,
      note,
      status: "pendiente",
      stockApplied: false,
      createdAt: new Date().toISOString().slice(0, 10),
      shippingPending: true,
      lines: cart.map((line) => ({ ...line, finalUnitPrice: line.unitPrice })),
      payments: [],
    };
    setSales((current) => [sale, ...current]);
  }

  function applySaleInventory(sale: Sale, direction: 1 | -1) {
    setStock((current) =>
      current.map((item) => {
        const saleQuantity = sale.lines
          .filter((line) => line.itemType === "card" && line.itemId === item.id)
          .reduce((sum, line) => sum + line.quantity, 0);
        if (!saleQuantity) return item;
        return { ...item, reserved: Math.max(0, item.reserved + saleQuantity * direction) };
      }),
    );
    setProducts((current) =>
      current.map((item) => {
        const saleQuantity = sale.lines
          .filter((line) => line.itemType === "product" && line.itemId === item.id)
          .reduce((sum, line) => sum + line.quantity, 0);
        if (!saleQuantity) return item;
        return { ...item, quantity: Math.max(0, item.quantity - saleQuantity * direction) };
      }),
    );
  }

  function changeSaleStatus(saleId: string, status: SaleStatus) {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) return;
    const nextShouldApply = shouldApplyStock(status);

    if (nextShouldApply && !sale.stockApplied) applySaleInventory(sale, 1);
    if (!nextShouldApply && sale.stockApplied) applySaleInventory(sale, -1);

    setSales((current) =>
      current.map((item) =>
        item.id === saleId ? { ...item, status, stockApplied: nextShouldApply } : item,
      ),
    );
  }

  function updateSaleLine(saleId: string, lineIndex: number, quantity: number, price: number) {
    setSales((current) =>
      current.map((sale) => {
        if (sale.id !== saleId || sale.stockApplied) return sale;
        return {
          ...sale,
          lines: sale.lines.map((line, index) =>
            index === lineIndex
              ? { ...line, quantity: Math.max(1, quantity), finalUnitPrice: Math.max(0, price) }
              : line,
          ),
        };
      }),
    );
  }

  function saveSaleLines(saleId: string, lines: SaleLine[]) {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) return;
    const nextSale = { ...sale, lines };
    if (sale.stockApplied) {
      applySaleInventory(sale, -1);
      applySaleInventory(nextSale, 1);
    }
    setSales((current) => current.map((item) => item.id === saleId ? nextSale : item));
  }

  return (
    <div className={clsx("app", theme)}>
      <AppLayout
        route={visibleRoute}
        navigate={navigate}
        goBack={goBack}
        theme={theme}
        setTheme={setTheme}
        cartCount={cart.reduce((sum, line) => sum + line.quantity, 0)}
        cartTotalValue={cartTotal(cart)}
        balanceValue={revenue - spent}
        isLoggedIn={isLoggedIn}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        logout={async () => {
          if (supabase) await supabase.auth.signOut();
          setIsLoggedIn(false);
          navigate("/");
        }}
      >
        {(visibleRoute === "/" || isSellerStockRoute(visibleRoute)) && (
          <PublicStockPage
            seller={publicSeller}
            stock={publicSellerStock}
            products={publicSellerProducts}
            cart={cart}
            addToCart={addToCart}
            addManyToCart={addManyToCart}
            canBuy={!isLoggedIn || publicSeller.id !== currentSeller.id}
            navigate={navigate}
          />
        )}
        {visibleRoute === "/quiero-vender" && <SellPage />}
        {visibleRoute === "/carrito" && (
          <CartPage
            cart={cart}
            setCart={setCart}
            sellerName={cartSeller.name}
            sellerWhatsapp={cartSeller.whatsapp}
            createPendingSale={createPendingSale}
          />
        )}
        {visibleRoute === "/login" && (
          <LoginPage
            navigate={navigate}
            authLoading={authLoading}
            authError={authError}
            login={async (email, password) => {
              setAuthError("");
              setAuthLoading(true);

              if (!supabase) {
                setAuthLoading(false);
                setAuthError("Falta configurar Supabase en .env.local.");
                return;
              }

              const { error } = await supabase.auth.signInWithPassword({ email, password });
              setAuthLoading(false);
              if (error) {
                setAuthError(error.message);
                return;
              }

              setIsLoggedIn(true);
              navigate("/ventas");
            }}
          />
        )}
        {sellerInactive && visibleRoute !== "/login" && <SubscriptionExpiredPage sellerWhatsapp={currentSeller.whatsapp} />}
        {!sellerInactive && isLoggedIn && visibleRoute === "/carga" && (
          <StockManagerPage
            sellerId={currentSeller.id}
            settings={sellerSettings}
            stock={sellerStock}
            setStock={setStock}
            products={sellerProducts}
            setProducts={setProducts}
            onPublishCards={publishCardsToSupabase}
            onPublishProduct={publishProductToSupabase}
          />
        )}
        {!sellerInactive && isLoggedIn && visibleRoute === "/gestion-stock" && (
          <StockManagementPage
            sellerId={currentSeller.id}
            stock={sellerStock}
            setStock={setStock}
            products={sellerProducts}
            setProducts={setProducts}
            onSaveCards={saveManagedCardsToSupabase}
            onSaveProducts={saveManagedProductsToSupabase}
          />
        )}
        {!sellerInactive && isLoggedIn && visibleRoute === "/ventas" && (
          <SalesPage sales={sellerSales} stock={sellerStock} products={sellerProducts} changeSaleStatus={changeSaleStatus} updateSaleLine={updateSaleLine} saveSaleLines={saveSaleLines} />
        )}
        {!sellerInactive && isLoggedIn && visibleRoute === "/panel" && <DashboardPage stock={sellerStock} sales={sellerSales} purchases={sellerPurchases} />}
        {!sellerInactive && isLoggedIn && visibleRoute === "/ajustes" && (
          <SettingsPage
            seller={currentSeller}
            sellers={sellerDirectory}
            isSuperAdmin={currentSeller.role === "admin"}
            navigateCreateSeller={() => navigate("/crear-vendedor")}
          />
        )}
        {!sellerInactive && isLoggedIn && visibleRoute === "/crear-vendedor" && <CreateSellerPage />}
      </AppLayout>
    </div>
  );
}

function mergeCartLines(current: CartLine[], additions: CartLine[]) {
  const nextSellerId = additions[0]?.sellerId;
  const currentSellerId = current[0]?.sellerId;
  const baseCart = nextSellerId && currentSellerId && nextSellerId !== currentSellerId ? [] : current;

  return additions.reduce<CartLine[]>((acc, line) => {
    const existing = acc.find((item) => item.itemId === line.itemId);
    if (!existing) return [...acc, { ...line, quantity: Math.min(line.quantity, line.maxQuantity) }];
    return acc.map((item) =>
      item.itemId === line.itemId
        ? { ...item, quantity: Math.min(item.maxQuantity, item.quantity + line.quantity) }
        : item,
    );
  }, baseCart);
}

function isSellerStockRoute(route: Route) {
  return /^\/[a-z0-9-]+\/stock$/i.test(route);
}

function getPublicSeller(route: Route, allSellers: Seller[]) {
  if (!isSellerStockRoute(route)) return allSellers.find((seller) => seller.isMain);
  const slug = route.split("/")[1];
  return allSellers.find((seller) => seller.slug === slug);
}

function mapSupabaseSeller(row: {
  id: string;
  slug: string;
  display_name: string;
  whatsapp: string | null;
  role: string;
  active: boolean;
  created_at: string;
}): Seller {
  return {
    ...fallbackSeller,
    id: row.id,
    name: row.display_name,
    slug: row.slug,
    whatsapp: row.whatsapp ?? "",
    role: row.role === "owner" ? "admin" : "seller",
    isMain: true,
    status: row.active ? "active" : "inactive",
    memberSince: row.created_at.slice(0, 10),
    subscriptionPlan: row.role === "owner" ? "owner" : fallbackSeller.subscriptionPlan,
  };
}

function mapSupabaseCard(row: {
  id: string;
  seller_id: string;
  card_number: number;
  expansion: string;
  variant_type: string;
  color_variant: string;
  quantity: number;
  reserved: number;
  price_ars: number;
}): CardStock {
  return {
    id: row.id,
    sellerId: row.seller_id,
    number: String(row.card_number),
    expansion: row.expansion,
    kind: row.variant_type as CardKind,
    variant: row.color_variant,
    quantity: row.quantity,
    reserved: row.reserved,
    price: row.price_ars,
  };
}

function mapSupabaseProduct(row: {
  id: string;
  seller_id: string;
  category: string;
  product_name: string;
  description: string | null;
  image_url: string | null;
  quantity: number;
  price_ars: number;
}): Product {
  return {
    id: row.id,
    sellerId: row.seller_id,
    name: row.product_name,
    category: row.category as Product["category"],
    description: row.description ?? "",
    quantity: row.quantity,
    price: row.price_ars,
    imageUrl: row.image_url ?? "",
  };
}

function upsertMainSeller(current: Seller[], seller: Seller): Seller[] {
  const rest = current
    .filter((item) => item.id !== seller.id && item.slug !== seller.slug)
    .map((item) => ({ ...item, isMain: false }));

  return [seller, ...rest];
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private contexts; the mock app still works in memory.
  }
}
