import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Filter, ShoppingCart, ShieldCheck, Truck, Wand2 } from "lucide-react";
import type { Route } from "../app/routes";
import type { CardStock, CartLine, Product, Seller } from "../lib/types";
import { availableQuantity, cartTotal, formatMoney, kindLabel, parseCardList } from "../lib/helpers";
import { APP_LIMITS, SEARCH_FILTERS } from "../lib/limits";
import { Pagination } from "../components/shared/Pagination";
import { CardResult } from "../components/cards/CardResult";
import { ProductCard } from "../components/cards/ProductCard";

export function PublicStockPage({
  seller,
  stock,
  products,
  cart,
  addToCart,
  addManyToCart,
  navigate,
}: {
  seller: Seller;
  stock: CardStock[];
  products: Product[];
  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  addManyToCart: (lines: CartLine[]) => void;
  navigate: (route: Route) => void;
}) {
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [variants, setVariants] = useState<string[]>([]);
  const [expansions, setExpansions] = useState<string[]>([]);
  const [cardPage, setCardPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const numbers = parseCardList(query);

  const results = stock.filter((item) => {
    const byNumber = numbers.length ? numbers.includes(item.number.toUpperCase()) : true;
    const byKind = !kinds.length || kinds.includes(item.kind);
    const byVariant = !variants.length || variants.includes(item.variant.toLowerCase());
    const byExpansion = !expansions.length || expansions.some((selected) => item.expansion.toLowerCase().includes(selected.toLowerCase()));
    return byNumber && byKind && byVariant && byExpansion && item.quantity > 0;
  });

  const grouped = Object.values(
    results.reduce<Record<string, CardStock[]>>((acc, item) => {
      acc[item.number] = [...(acc[item.number] ?? []), item];
      return acc;
    }, {}),
  );

  const massAddLines = useMemo(() => {
    const requested = new Set(numbers);
    return stock
      .filter((item) => requested.has(item.number.toUpperCase()) && availableQuantity(item) > 0)
      .map((item) => ({
        itemType: "card" as const,
        itemId: item.id,
        sellerId: item.sellerId,
        label: `Carta ${item.number} · ${kindLabel[item.kind]} ${item.variant}`,
        unitPrice: item.price,
        quantity: 1,
        maxQuantity: availableQuantity(item),
      }));
  }, [numbers, stock]);

  const cardPageSize = 8;
  const productPageSize = 6;
  const visibleCards = grouped.slice((cardPage - 1) * cardPageSize, cardPage * cardPageSize);
  const visibleProducts = products.slice((productPage - 1) * productPageSize, productPage * productPageSize);

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
          {seller.shippingEnabled && (
            <small><Truck size={14} /> Realiza envíos con {seller.shippingCompanies.join(", ")}.</small>
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
          <MultiFilter
            title="Tipo"
            options={SEARCH_FILTERS.kinds.filter((item) => item !== "todas")}
            selected={kinds}
            setSelected={(next) => { setKinds(next); setCardPage(1); }}
          />
          <MultiFilter
            title="Variante"
            options={SEARCH_FILTERS.variants.filter((item) => item !== "todas")}
            selected={variants}
            setSelected={(next) => { setVariants(next); setCardPage(1); }}
          />
          <MultiFilter
            title="Expansión"
            options={SEARCH_FILTERS.expansions.filter((item) => item !== "todas")}
            selected={expansions}
            setSelected={(next) => { setExpansions(next); setCardPage(1); }}
          />
        </div>
        <div className="search-actions">
          <button className="secondary-button" onClick={() => addManyToCart(massAddLines)} disabled={!massAddLines.length}>
            <Wand2 size={18} />
            Agregar encontrados
          </button>
          <button className="cart-jump" onClick={() => navigate("/carrito")}>
            <ShoppingCart size={18} />
            <span>Carrito: {cart.length} ítems · {formatMoney(cartTotal(cart))}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleCards.map((items) => (
          <CardResult key={items[0].number} items={items} addToCart={addToCart} />
        ))}
      </div>
      <Pagination page={cardPage} pageSize={cardPageSize} total={grouped.length} onPageChange={setCardPage} />

      <div className="section-heading">
        <h3>Otros productos</h3>
        <span>{products.length} publicados</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} addToCart={addToCart} />
        ))}
      </div>
      <Pagination page={productPage} pageSize={productPageSize} total={products.length} onPageChange={setProductPage} />
    </div>
  );
}

function MultiFilter({
  title,
  options,
  selected,
  setSelected,
}: {
  title: string;
  options: string[];
  selected: string[];
  setSelected: (next: string[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const label = selected.length ? `${selected.length} seleccionada${selected.length === 1 ? "" : "s"}` : "Todas";

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
