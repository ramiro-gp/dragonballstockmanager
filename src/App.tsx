import { useEffect, useState } from "react";
import clsx from "clsx";
import { getCurrentRoute, privateRoutes, type Route } from "./app/routes";
import { AppLayout } from "./components/layout/AppLayout";
import { initialProducts, initialPurchases, initialSales, initialStock, sellers } from "./data/mockData";
import { availableQuantity, cartTotal, saleTotal, shouldApplyStock } from "./lib/helpers";
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
  const publicSellerStock = stock.filter((item) => item.sellerId === publicSeller.id && availableQuantity(item) > 0);
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

    void loadPublicSellersFromSupabase();

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
    await loadSellerSalesFromSupabase(userId);
  }

  async function loadPublicSellersFromSupabase() {
    if (!supabase) return;

    const { data } = await supabase
      .from("sellers")
      .select("id, slug, display_name, whatsapp, role, active, created_at")
      .eq("active", true);

    if (!data?.length) return;

    const mapped = data.map(mapSupabaseSeller);
    const main = mapped.find((seller) => seller.slug === "ramitagarcia") ?? mapped[0];
    setCurrentSeller((current) => current.id === fallbackSellerId ? main : current);
    setSellerDirectory([
      { ...main, isMain: true },
      ...mapped.filter((seller) => seller.id !== main.id).map((seller) => ({ ...seller, isMain: false })),
    ]);
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

  async function loadSellerSalesFromSupabase(sellerId: string) {
    if (!supabase) return;

    const { data: saleRows } = await supabase
      .from("sales")
      .select(`
        id,
        seller_id,
        customer_name,
        customer_whatsapp,
        customer_note,
        status,
        stock_applied,
        total_ars,
        created_at,
        sale_lines (
          id,
          item_type,
          stock_card_id,
          stock_product_id,
          card_number,
          expansion,
          variant_type,
          color_variant,
          product_name,
          quantity,
          unit_price_ars
        ),
        payments (
          id,
          amount_ars,
          note,
          paid_at
        )
      `)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (saleRows) {
      const nextSales = saleRows.map(mapSupabaseSale);
      setSales((current) => [
        ...current.filter((sale) => sale.sellerId !== sellerId && sale.sellerId !== fallbackSellerId),
        ...nextSales,
      ]);
    }
  }

  async function publishCardsToSupabase(rows: PublishCardInput[]) {
    if (!supabase) return null;

    const aggregated = Array.from(
      rows.reduce<Map<string, PublishCardInput>>((acc, row) => {
        const key = [row.number, row.expansion, row.kind, row.variant].join("|");
        const current = acc.get(key);
        acc.set(key, current ? { ...row, quantity: current.quantity + row.quantity } : row);
        return acc;
      }, new Map()).values(),
    );

    const { data: existingRows } = await supabase
      .from("stock_cards")
      .select("id, card_number, expansion, variant_type, color_variant, quantity")
      .eq("seller_id", currentSeller.id)
      .eq("collection", "cromeros");

    const existingByKey = new Map(
      (existingRows ?? []).map((row) => [
        [String(row.card_number), row.expansion, row.variant_type, row.color_variant].join("|"),
        row,
      ]),
    );

    const inserts = [];
    const updates = [];

    for (const row of aggregated) {
      const cardNumber = Number.parseInt(row.number, 10);
      if (!Number.isFinite(cardNumber)) continue;
      const existing = existingByKey.get([row.number, row.expansion, row.kind, row.variant].join("|"));

      if (existing?.id) {
        updates.push(
          supabase
            .from("stock_cards")
            .update({
              quantity: (existing.quantity ?? 0) + row.quantity,
              price_ars: row.price,
            })
            .eq("id", existing.id),
        );
        continue;
      }

      inserts.push({
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

    if (inserts.length) await supabase.from("stock_cards").insert(inserts);
    await Promise.all(updates);

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

  async function createPendingSale(customerName: string, customerWhatsapp: string, note: string, orderNumber: string) {
    if (!cart.length) return false;

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

    if (supabase) {
      const { data: rpcSaleId, error: rpcError } = await supabase.rpc("create_pending_sale", {
        p_seller_id: sale.sellerId,
        p_customer_name: sale.customerName,
        p_customer_whatsapp: sale.customerWhatsapp,
        p_customer_note: sale.note,
        p_lines: sale.lines.map(saleLineToRpcPayload),
      });

      if (!rpcError && rpcSaleId) {
        await loadSellerSalesFromSupabase(sale.sellerId);
        setCart([]);
        return true;
      }

      const { data } = await supabase
        .from("sales")
        .insert({
          seller_id: sale.sellerId,
          customer_name: sale.customerName,
          customer_whatsapp: sale.customerWhatsapp,
          customer_note: sale.note,
          status: toSupabaseStatus(sale.status),
          stock_applied: false,
          total_ars: saleTotal(sale),
        })
        .select("id, seller_id, customer_name, customer_whatsapp, customer_note, status, stock_applied, total_ars, created_at")
        .single();

      if (data) {
        const saleId = data.id;
        const rows = sale.lines.map((line) => saleLineToSupabaseInsert(saleId, sale.sellerId, line));
        const { error: linesError } = rows.length ? await supabase.from("sale_lines").insert(rows) : { error: null };
        if (linesError) return false;
        await loadSellerSalesFromSupabase(sale.sellerId);
        setCart([]);
        return true;
      }

      return false;
    }

    setSales((current) => [sale, ...current]);
    setCart([]);
    return true;
  }

  function applySaleInventorySnapshot(stockRows: CardStock[], productRows: Product[], sale: Sale, direction: 1 | -1) {
    const nextStock = stockRows.map((item) => {
      const saleQuantity = sale.lines
        .filter((line) => line.itemType === "card" && line.itemId === item.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (!saleQuantity) return item;
      return { ...item, reserved: Math.max(0, item.reserved + saleQuantity * direction) };
    });

    const nextProducts = productRows.map((item) => {
      const saleQuantity = sale.lines
        .filter((line) => line.itemType === "product" && line.itemId === item.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (!saleQuantity) return item;
      return { ...item, quantity: Math.max(0, item.quantity - saleQuantity * direction) };
    });

    return { nextStock, nextProducts };
  }

  async function persistSaleToSupabase(sale: Sale) {
    if (!supabase) return;

    await supabase
      .from("sales")
      .update({
        status: toSupabaseStatus(sale.status),
        stock_applied: sale.stockApplied,
        total_ars: saleTotal(sale),
        customer_note: sale.note,
      })
      .eq("id", sale.id);

    await supabase.from("sale_lines").delete().eq("sale_id", sale.id);
    const rows = sale.lines.map((line) => saleLineToSupabaseInsert(sale.id, sale.sellerId, line));
    if (rows.length) await supabase.from("sale_lines").insert(rows);
  }

  async function changeSaleStatus(saleId: string, status: SaleStatus) {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) return;
    const nextShouldApply = shouldApplyStock(status);
    let nextStock = stock;
    let nextProducts = products;

    if (nextShouldApply && !sale.stockApplied) {
      const inventory = applySaleInventorySnapshot(nextStock, nextProducts, sale, 1);
      nextStock = inventory.nextStock;
      nextProducts = inventory.nextProducts;
    }
    if (!nextShouldApply && sale.stockApplied) {
      const inventory = applySaleInventorySnapshot(nextStock, nextProducts, sale, -1);
      nextStock = inventory.nextStock;
      nextProducts = inventory.nextProducts;
    }

    const nextSale = { ...sale, status, stockApplied: nextShouldApply };

    if (supabase) {
      const { error: rpcError } = await supabase.rpc("set_sale_status", {
        p_sale_id: saleId,
        p_status: toSupabaseStatus(status),
      });

      if (!rpcError) {
        await loadSellerInventoryFromSupabase(currentSeller.id);
        await loadSellerSalesFromSupabase(currentSeller.id);
        return;
      }
    }

    setStock(nextStock);
    setProducts(nextProducts);
    setSales((current) => current.map((item) => item.id === saleId ? nextSale : item));
    await persistSaleToSupabase(nextSale);
    if (supabase) {
      await saveManagedCardsToSupabase(nextStock.filter((item) => item.sellerId === currentSeller.id));
      await saveManagedProductsToSupabase(nextProducts.filter((item) => item.sellerId === currentSeller.id));
      await loadSellerSalesFromSupabase(currentSeller.id);
    }
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

  async function saveSaleLines(saleId: string, lines: SaleLine[]) {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) return;
    const nextSale = { ...sale, lines };
    let nextStock = stock;
    let nextProducts = products;

    if (sale.stockApplied) {
      const reverted = applySaleInventorySnapshot(nextStock, nextProducts, sale, -1);
      const applied = applySaleInventorySnapshot(reverted.nextStock, reverted.nextProducts, nextSale, 1);
      nextStock = applied.nextStock;
      nextProducts = applied.nextProducts;
      setStock(nextStock);
      setProducts(nextProducts);
    }

    setSales((current) => current.map((item) => item.id === saleId ? nextSale : item));
    await persistSaleToSupabase(nextSale);
    if (supabase && sale.stockApplied) {
      await saveManagedCardsToSupabase(nextStock.filter((item) => item.sellerId === currentSeller.id));
      await saveManagedProductsToSupabase(nextProducts.filter((item) => item.sellerId === currentSeller.id));
      await loadSellerSalesFromSupabase(currentSeller.id);
    }
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
    whatsapp: row.whatsapp || fallbackSeller.whatsapp,
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

function mapSupabaseSale(row: {
  id: string;
  seller_id: string;
  customer_name: string | null;
  customer_whatsapp: string | null;
  customer_note: string | null;
  status: string;
  stock_applied: boolean;
  created_at: string;
  sale_lines?: Array<{
    id: string;
    item_type: string;
    stock_card_id: string | null;
    stock_product_id: string | null;
    card_number: number | null;
    variant_type: string | null;
    color_variant: string | null;
    product_name: string | null;
    quantity: number;
    unit_price_ars: number;
  }>;
  payments?: Array<{
    id: string;
    amount_ars: number;
    note: string | null;
    paid_at: string;
  }>;
}): Sale {
  return {
    id: row.id,
    orderNumber: `DBSM-${row.id.slice(0, 8).toUpperCase()}`,
    sellerId: row.seller_id,
    customerName: row.customer_name ?? "Cliente sin nombre",
    customerWhatsapp: row.customer_whatsapp ?? "",
    note: row.customer_note ?? "",
    status: fromSupabaseStatus(row.status),
    stockApplied: row.stock_applied,
    createdAt: row.created_at.slice(0, 10),
    shippingPending: fromSupabaseStatus(row.status) !== "confirmada",
    lines: (row.sale_lines ?? []).map((line) => ({
      itemType: line.item_type === "product" ? "product" : "card",
      itemId: line.stock_product_id ?? line.stock_card_id ?? line.id,
      sellerId: row.seller_id,
      label: line.product_name ?? `Carta ${line.card_number ?? ""} - ${line.variant_type ?? ""} ${line.color_variant ?? ""}`.trim(),
      unitPrice: line.unit_price_ars,
      finalUnitPrice: line.unit_price_ars,
      quantity: line.quantity,
      maxQuantity: Math.max(1, line.quantity),
    })),
    payments: (row.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount_ars,
      note: payment.note ?? "",
      date: payment.paid_at.slice(0, 10),
    })),
  };
}

function toSupabaseStatus(status: SaleStatus) {
  if (status === "pendiente") return "pending";
  if (status === "reservada") return "reserved";
  if (status === "confirmada") return "confirmed";
  return "cancelled";
}

function fromSupabaseStatus(status: string): SaleStatus {
  if (status === "reserved") return "reservada";
  if (status === "confirmed" || status === "delivered") return "confirmada";
  if (status === "cancelled") return "cancelada";
  return "pendiente";
}

function saleLineToSupabaseInsert(saleId: string, sellerId: string, line: SaleLine) {
  return {
    sale_id: saleId,
    seller_id: sellerId,
    ...saleLineToRpcPayload(line),
  };
}

function saleLineToRpcPayload(line: SaleLine) {
  const isProduct = line.itemType === "product";
  const cardNumber = isProduct ? null : Number.parseInt(line.label.match(/Carta\s+(\d+)/i)?.[1] ?? "", 10);
  const cardDescription = line.label
    .replace(/Carta\s+\d+/i, "")
    .replace(/[·-]/g, " ")
    .trim();
  const [variantType = "", ...colorParts] = cardDescription.split(/\s+/).filter(Boolean);

  return {
    item_type: line.itemType,
    stock_card_id: isProduct ? null : line.itemId,
    stock_product_id: isProduct ? line.itemId : null,
    card_number: Number.isFinite(cardNumber) ? cardNumber : null,
    expansion: null,
    variant_type: isProduct ? null : variantType || null,
    color_variant: isProduct ? null : colorParts.join(" ") || null,
    product_name: isProduct ? line.label : null,
    quantity: line.quantity,
    unit_price_ars: line.finalUnitPrice,
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
