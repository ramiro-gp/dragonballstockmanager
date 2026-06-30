import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Filter, LayoutGrid, List, MapPin, Plus, ShoppingCart, ShieldCheck, Truck, Wand2 } from "lucide-react";
import type { Route } from "../app/routes";
import type { CardStock, CartLine, Product, Seller } from "../lib/types";
import { availableProductQuantity, availableQuantity, cartTotal, formatMoney, kindLabel, parseCardList } from "../lib/helpers";
import { APP_LIMITS, SEARCH_FILTERS } from "../lib/limits";
import { Pagination } from "../components/shared/Pagination";
import { CardResult } from "../components/cards/CardResult";
import { ProductCard } from "../components/cards/ProductCard";
import { variantDisplayLabel } from "../data/cromerosCatalog";

const colorVariantOptions = ["Dorado", "Plateado", "Dorado opaco", "Plateado opaco", "Rojo", "Azul", "Verde", "Violeta", "Amarillo", "Bronce", "Patrones", "Arcoiris", "Tornasolado", "Naranja", "Turquesa", "Celeste", "Rosa", "Fluor"];

export function PublicStockPage({
  seller,
  stock,
  products,
  cart,
  addToCart,
  addManyToCart,
  canBuy,
  navigate,
}: {
  seller: Seller;
  stock: CardStock[];
  products: Product[];
  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  addManyToCart: (lines: CartLine[]) => void;
  canBuy: boolean;
  navigate: (route: Route) => void;
}) {
  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [expansions, setExpansions] = useState<string[]>([]);
  const [collection, setCollection] = useState<"cromeros" | "leyenda">("cromeros");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [cardPage, setCardPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const numbers = parseCardList(query);

  const results = useMemo(() => stock.filter((item) => {
    const byNumber = numbers.length ? numbers.includes(item.number.toUpperCase()) : true;
    const byVariant = !variants.length || variants.map((value) => value.toLowerCase()).includes(item.variant.toLowerCase());
    const byExpansion = !expansions.length || expansions.some((selected) => item.expansion.toLowerCase().includes(selected.toLowerCase()));
    return byNumber && byVariant && byExpansion && availableQuantity(item) > 0;
  }), [expansions, numbers, stock, variants]);

  const grouped = Object.values(
    results.reduce<Record<string, CardStock[]>>((acc, item) => {
      acc[item.number] = [...(acc[item.number] ?? []), item];
      return acc;
    }, {}),
  );

  const massAddLines = useMemo(() => {
    const requested = new Set(numbers);
    return results
      .filter((item) => requested.has(item.number.toUpperCase()) && availableQuantity(item) > 0)
      .map((item) => ({
        itemType: "card" as const,
        itemId: item.id,
        sellerId: item.sellerId,
        label: `N° ${item.number} - ${kindLabel[item.kind]} ${variantDisplayLabel(item.variant)}`,
        unitPrice: item.price,
        quantity: 1,
        maxQuantity: availableQuantity(item),
      }));
  }, [numbers, results]);

  const cardPageSize = viewMode === "cards" ? 8 : 12;
  const productPageSize = 6;
  const visibleCards = grouped.slice((cardPage - 1) * cardPageSize, cardPage * cardPageSize);
  const visibleRows = results.slice((cardPage - 1) * cardPageSize, cardPage * cardPageSize);
  const availableProducts = products.filter((product) => availableProductQuantity(product) > 0);
  const visibleProducts = availableProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize);
  const cardsTotal = viewMode === "cards" ? grouped.length : results.length;

  function addAllFound() {
    addManyToCart(massAddLines);
    if (massAddLines.length) navigate("/carrito");
  }

  return (
    <div className="space-y-5">
      <div className="hero-band">
        <div>
          <p className="eyebrow">/{seller.slug}/stock</p>
          <h2 className="hero-title">Pegá tus faltantes y revisá el stock disponible</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Buscá por lista, filtrá variantes y armá tu consulta para enviarla por WhatsApp.
          </p>
        </div>
        <div className="scouter-card">
          <div className="scouter-main">
            <ShieldCheck size={22} />
            <span>Stock visible: {seller.name}</span>
          </div>
          {seller.location && <small><MapPin size={14} /> Ubicación: {seller.location}</small>}
          {seller.shippingEnabled && (
            <small><Truck size={14} /> Realiza envíos con {seller.shippingCompanies.length ? seller.shippingCompanies.join(", ") : "correo a coordinar"}.</small>
          )}
        </div>
      </div>

      <div className="search-panel">
        <div className="search-panel-heading">
          <div>
            <p className="eyebrow">Buscador</p>
            <h3>Encontrá cartas por lista o filtros</h3>
          </div>
          <Filter size={20} />
        </div>
        <div className="search-grid">
          <div className="filter-group">
            <div className="filter-group-header"><span>Colección</span></div>
            <div className="view-toggle collection-toggle" aria-label="Colección">
              <button className={clsx(collection === "cromeros" && "active")} onClick={() => setCollection("cromeros")}>Cromeros</button>
              <button className={clsx(collection === "leyenda" && "active")} onClick={() => setCollection("leyenda")}>Leyenda</button>
            </div>
          </div>
          <label className="field search-list">
            <span>Lista de faltantes</span>
            <textarea
              value={query}
              maxLength={APP_LIMITS.searchInputMaxLength}
              onChange={(event) => { setQuery(event.target.value); setCardPage(1); }}
              rows={4}
              placeholder="Ej: 1110, 1275, 504F"
            />
          </label>
          <MultiFilter title="Filtrar por expansión" options={SEARCH_FILTERS.expansions.filter((item) => item !== "todas")} selected={expansions} setSelected={(next) => { setExpansions(next); setCardPage(1); }} />
          <MultiFilter title="Filtrar por color variante" options={colorVariantOptions} selected={variants} setSelected={(next) => { setVariants(next); setCardPage(1); }} showSwatches />
        </div>
        <div className="search-actions">
          {canBuy ? (
            <button className="secondary-button" onClick={addAllFound} disabled={!massAddLines.length}>
              <Wand2 size={18} />
              Agregar todos los encontrados al carrito
            </button>
          ) : (
            <div className="seller-own-stock-note">Estás viendo tu propio stock publicado.</div>
          )}
          <div className="view-toggle" aria-label="Modo de vista">
            <button className={clsx(viewMode === "cards" && "active")} onClick={() => { setViewMode("cards"); setCardPage(1); }}>
              <LayoutGrid size={17} />
              Grilla
            </button>
            <button className={clsx(viewMode === "table" && "active")} onClick={() => { setViewMode("table"); setCardPage(1); }}>
              <List size={17} />
              Tabla
            </button>
          </div>
          {canBuy && <button className="cart-jump" onClick={() => navigate("/carrito")}>
            <ShoppingCart size={18} />
            <span>Carrito: {cart.length} ítems · {formatMoney(cartTotal(cart))}</span>
          </button>}
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleCards.map((items) => <CardResult key={items[0].number} items={items} addToCart={addToCart} canBuy={canBuy} />)}
        </div>
      ) : (
        <div className="card-table">
          <div className="card-table-row header">
            <span>N° carta</span>
            <span>Variante</span>
            <span>Color variante</span>
            <span>Expansión</span>
            <span>Precio</span>
            <span>Cantidad</span>
            <span></span>
          </div>
          {visibleRows.map((item) => (
            <div key={item.id} className="card-table-row">
              <strong>{item.number}</strong>
              <span>{kindLabel[item.kind]}</span>
              <span>{variantDisplayLabel(item.variant)}</span>
              <span>{item.expansion}</span>
              <strong>{formatMoney(item.price)}</strong>
              <span>x{availableQuantity(item)}</span>
              {canBuy && <button
                className="icon-button small"
                onClick={() =>
                  addToCart({
                    itemType: "card",
                    itemId: item.id,
                    sellerId: item.sellerId,
                    label: `N° ${item.number} - ${kindLabel[item.kind]} ${variantDisplayLabel(item.variant)}`,
                    unitPrice: item.price,
                    quantity: 1,
                    maxQuantity: availableQuantity(item),
                  })
                }
                disabled={availableQuantity(item) <= 0}
                aria-label="Agregar al carrito"
              >
                <Plus size={16} />
              </button>}
            </div>
          ))}
        </div>
      )}
      {cardsTotal === 0 && <p className="empty">No hay cartas con esos filtros.</p>}
      <Pagination page={cardPage} pageSize={cardPageSize} total={cardsTotal} onPageChange={setCardPage} />

      <div className="section-heading">
        <h3>Otros productos</h3>
        <span>{availableProducts.length} publicados</span>
      </div>
      <div className="product-grid">
        {visibleProducts.map((product) => <ProductCard key={product.id} product={product} addToCart={addToCart} canBuy={canBuy} />)}
      </div>
      {!availableProducts.length && <p className="empty">No hay otros productos publicados.</p>}
      <Pagination page={productPage} pageSize={productPageSize} total={availableProducts.length} onPageChange={setProductPage} />
    </div>
  );
}

function MultiFilter({
  title,
  options,
  selected,
  setSelected,
  showSwatches = false,
}: {
  title: string;
  options: string[];
  selected: string[];
  setSelected: (next: string[]) => void;
  showSwatches?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const label = selected.length ? `${selected.length} seleccionada${selected.length === 1 ? "" : "s"}` : "Todas";

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle(option: string) {
    setSelected(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  return (
    <div className="filter-group" ref={containerRef}>
      <div className="filter-group-header">
        <span>{title}</span>
        {selected.length > 0 && <button onClick={() => setSelected([])}>Limpiar</button>}
      </div>
      <button type="button" className={clsx("multi-select-trigger", open && "open")} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <ChevronDown size={17} />
      </button>
      {open && (
        <div className="multi-select-menu">
          {options.map((option) => {
            const active = selected.includes(option);
            return (
              <button key={option} type="button" className={clsx("multi-select-option", active && "active")} onClick={() => toggle(option)}>
                <span className="multi-select-check">{active && <Check size={14} />}</span>
                {showSwatches && <span className="variant-swatch" style={{ background: swatchBackground(option) }} />}
                <span>{variantDisplayLabel(option)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function swatchBackground(option: string) {
  const value = option.toLowerCase();
  if (value.includes("dorado") && !value.includes("opaco")) return "linear-gradient(135deg, #fff2a6, #c98b16, #fff4b8)";
  if (value.includes("plateado") && !value.includes("opaco")) return "linear-gradient(135deg, #ffffff, #a8adb4, #f3f4f6)";
  if (value.includes("dorado opaco")) return "#b88a2d";
  if (value.includes("plateado opaco")) return "#9ca3af";
  if (value.includes("rojo")) return "#dc2626";
  if (value.includes("azul")) return "#2563eb";
  if (value.includes("verde")) return "#16a34a";
  if (value.includes("violeta")) return "#7c3aed";
  if (value.includes("amarillo")) return "#facc15";
  if (value.includes("bronce")) return "#92400e";
  if (value.includes("naranja")) return "#f97316";
  if (value.includes("turquesa")) return "#14b8a6";
  if (value.includes("celeste")) return "#38bdf8";
  if (value.includes("rosa")) return "#ec4899";
  if (value.includes("arcoiris")) return "linear-gradient(135deg, #ef4444, #facc15, #22c55e, #3b82f6, #8b5cf6)";
  if (value.includes("tornasolado")) return "linear-gradient(135deg, #a7f3d0, #bfdbfe, #fbcfe8)";
  if (value.includes("patrones")) return "repeating-linear-gradient(45deg, #111827 0 4px, #f59e0b 4px 8px)";
  if (value.includes("fluor")) return "#a3e635";
  return "var(--soft)";
}
