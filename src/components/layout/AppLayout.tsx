import { useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  BarChart3,
  ClipboardList,
  FilePenLine,
  Home,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Sun,
  UserPlus,
  X,
} from "lucide-react";
import type { Route } from "../../app/routes";
import type { Theme } from "../../lib/types";
import { formatMoney } from "../../lib/helpers";
import { Donation, MercadoPagoButton } from "../shared/Donation";
import { Brand } from "./Brand";

const APP_VERSION = "v0.57.6";

export function AppLayout({
  children,
  route,
  navigate,
  goBack,
  theme,
  setTheme,
  cartCount,
  cartTotalValue,
  balanceValue,
  onBalanceClick,
  isLoggedIn,
  isSuperAdmin,
  sidebarCollapsed,
  setSidebarCollapsed,
  logout,
}: {
  children: ReactNode;
  route: Route;
  navigate: (route: Route) => void;
  goBack: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cartCount: number;
  cartTotalValue: number;
  balanceValue: number;
  onBalanceClick: () => void;
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  logout: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = [
    { route: "/", label: "Stock", icon: Home },
    { route: "/panel", label: "Panel", icon: BarChart3 },
    { route: "/carga", label: "Publicar", icon: PackagePlus },
    { route: "/gestion-stock", label: "Gestionar", icon: FilePenLine },
    { route: "/ventas", label: "Mis ventas", icon: ClipboardList },
    { route: "/ajustes", label: "Ajustes", icon: Settings },
    { route: "/crear-vendedor", label: "Crear vendedor", icon: UserPlus },
  ] as const;
  const sellerNav = nav.filter((item) => item.route !== "/crear-vendedor" || isSuperAdmin);
  function go(routeToOpen: Route) {
    navigate(routeToOpen);
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-shell bg-[var(--bg)] text-[var(--text)]">
      <header className="app-header">
        <div className="header-left">
          <button className="brand-button hidden sm:block" onClick={() => navigate("/")} title="Esto es un scouter XD">
            <Brand compact />
          </button>
          {isLoggedIn && (
            <button className="icon-button desktop-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Alternar sidebar">
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
          <button className="icon-button mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <div className="header-actions">
          {isLoggedIn && (
            <button className={clsx("balance-pill", balanceValue >= 0 ? "positive" : "negative")} onClick={onBalanceClick}>
              Balance {formatMoney(balanceValue)}
            </button>
          )}
          {!isLoggedIn && <button className="seller-button primary-cta" onClick={() => navigate("/quiero-vender")}>Quiero ser vendedor</button>}
          <button className="cart-button" onClick={() => navigate("/carrito")} aria-label="Abrir carrito">
            <ShoppingCart size={18} />
            <span>{cartCount}</span>
            <strong className="hidden sm:inline">{formatMoney(cartTotalValue)}</strong>
          </button>
          <button className="icon-button desktop-header-action" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Cambiar tema">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {isLoggedIn ? (
            <button className="icon-button desktop-header-action" onClick={logout} aria-label="Salir">
              <LogOut size={18} />
            </button>
          ) : (
            <button className="login-button desktop-header-action" onClick={() => navigate("/login")}>
              <LogIn size={17} />
              Login
            </button>
          )}
        </div>
      </header>

      {isLoggedIn && (
        <aside className={clsx("app-sidebar", sidebarCollapsed && "collapsed")}>
          <nav className="space-y-2">
            {sellerNav.map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={clsx("nav-button", route === item.route && "active")}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={19} />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          {!sidebarCollapsed && (
            <div className="sidebar-support">
              <Donation />
            </div>
          )}
        </aside>
      )}

      {mobileMenuOpen && (
        <div className="mobile-menu-panel">
          <div className="mobile-menu-head">
            <Brand compact />
            <span>{isLoggedIn ? "Menú vendedor" : "Menú"}</span>
          </div>
          <div className="mobile-menu-list">
            {(isLoggedIn ? sellerNav : [
              { route: "/", label: "Stock", icon: Home },
              { route: "/login", label: "Login", icon: LogIn },
              { route: "/quiero-vender", label: "Quiero ser vendedor", icon: UserPlus, primary: true },
            ] as const).map((item) => (
              <button key={item.route} onClick={() => go(item.route)} className={clsx("mobile-menu-item", route === item.route && "active", "primary" in item && item.primary && "primary")}>
                <item.icon size={18} />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mobile-menu-actions">
            <button className="secondary-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              Cambiar tema
            </button>
            {isLoggedIn && (
              <button className="secondary-button" onClick={logout}>
                <LogOut size={18} />
                Salir
              </button>
            )}
          </div>
        </div>
      )}

      <main className={clsx("app-main", isLoggedIn && "with-sidebar", sidebarCollapsed && "sidebar-collapsed")}>
        <div className="app-content mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {children}
          <AppFooter navigate={navigate} />
        </div>
      </main>
    </div>
  );
}

function AppFooter({ navigate }: { navigate: (route: Route) => void }) {
  return (
    <footer className="app-footer">
      <div className="footer-main">
        <div className="footer-identity">
          <Brand compact />
        </div>
        <div className="footer-actions donation-actions">
          <span>Ayudame con una donación</span>
          <a className="small-button subtle" href="https://cafecito.app/ramitag" target="_blank" rel="noopener noreferrer">Cafecito</a>
          <MercadoPagoButton className="small-button subtle" />
        </div>
        <div className="footer-actions vendor-footer-action">
          <button className="primary-button compact" onClick={() => navigate("/quiero-vender")}>Quiero ser vendedor</button>
        </div>
      </div>
      <div className="footer-legal">
        <p>© Todos los derechos reservados. Desarrollado por <a href="https://ramirogp.me" target="_blank" rel="noopener noreferrer">Ramiro García</a>.</p>
        <span className="app-version">{APP_VERSION}</span>
      </div>
    </footer>
  );
}
