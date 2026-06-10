import { useEffect, useState } from "react";
import clsx from "clsx";
import { getCurrentRoute, privateRoutes, type Route } from "./app/routes";
import { AppLayout } from "./components/layout/AppLayout";
import { initialProducts, initialPurchases, initialSales, initialStock, sellers } from "./data/mockData";
import { cartTotal, saleTotal, shouldApplyStock } from "./lib/helpers";
import type { CardStock, CartLine, Product, Purchase, Sale, SaleStatus, Seller, Theme } from "./lib/types";
import { CartPage } from "./pages/CartPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { CreateSellerPage } from "./pages/CreateSellerPage";
import { PublicStockPage } from "./pages/PublicStockPage";
import { SalesPage } from "./pages/SalesPage";
import { SellPage } from "./pages/SellPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StockManagerPage } from "./pages/StockManagerPage";
import { SubscriptionExpiredPage } from "./pages/SubscriptionExpiredPage";

const currentSeller = sellers[0];

export function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [route, setRoute] = useState<Route>(getCurrentRoute());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stock, setStock] = useState<CardStock[]>(initialStock);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [purchases] = useState<Purchase[]>(initialPurchases);
  const [cart, setCart] = useState<CartLine[]>([]);

  const publicSeller = getPublicSeller(route, sellers) ?? currentSeller;
  const sellerStock = stock.filter((item) => item.sellerId === currentSeller.id);
  const sellerProducts = products.filter((item) => item.sellerId === currentSeller.id);
  const publicSellerStock = stock.filter((item) => item.sellerId === publicSeller.id);
  const publicSellerProducts = products.filter((item) => item.sellerId === publicSeller.id && item.quantity > 0);
  const sellerSales = sales.filter((sale) => sale.sellerId === currentSeller.id);
  const sellerPurchases = purchases.filter((purchase) => purchase.sellerId === currentSeller.id);
  const cartSeller = sellers.find((seller) => seller.id === cart[0]?.sellerId) ?? publicSeller;
  const revenue = sellerSales.filter((sale) => sale.status === "confirmada").reduce((sum, sale) => sum + saleTotal(sale), 0);
  const spent = sellerPurchases.reduce((sum, purchase) => sum + purchase.totalSpent, 0);
  const visibleRoute = !isLoggedIn && privateRoutes.includes(route) ? "/login" : route;
  const sellerInactive = isLoggedIn && currentSeller.status === "inactive";

  useEffect(() => {
    const onPopState = () => setRoute(getCurrentRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextRoute: Route) {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
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
        logout={() => {
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
            login={() => {
              setIsLoggedIn(true);
              navigate("/ventas");
            }}
          />
        )}
        {sellerInactive && visibleRoute !== "/login" && <SubscriptionExpiredPage sellerWhatsapp={currentSeller.whatsapp} />}
        {!sellerInactive && isLoggedIn && visibleRoute === "/carga" && (
          <StockManagerPage sellerId={currentSeller.id} stock={sellerStock} setStock={setStock} products={sellerProducts} setProducts={setProducts} />
        )}
        {!sellerInactive && isLoggedIn && visibleRoute === "/ventas" && (
          <SalesPage sales={sellerSales} changeSaleStatus={changeSaleStatus} updateSaleLine={updateSaleLine} />
        )}
        {!sellerInactive && isLoggedIn && visibleRoute === "/panel" && <DashboardPage stock={sellerStock} sales={sellerSales} purchases={sellerPurchases} />}
        {!sellerInactive && isLoggedIn && visibleRoute === "/ajustes" && (
          <SettingsPage
            seller={currentSeller}
            sellers={sellers}
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
