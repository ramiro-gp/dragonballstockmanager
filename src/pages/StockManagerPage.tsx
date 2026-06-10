import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Layers3, Package, PackagePlus } from "lucide-react";
import { getColorOptions, getCromerosExpansion, getDefaultKind, getKindOptions, needsVariantChoice, type VariantDraft } from "../data/cromerosCatalog";
import type { CardKind, CardStock, Product, SellerSettings } from "../lib/types";
import { groupNumbers, parseCardList, parseRange } from "../lib/helpers";

const defaultImageUrl = "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=900&q=80";
const defaultPrices: Record<CardKind, number> = { comun: 400, fluor: 700, holo: 2000 };

export function StockManagerPage({
  sellerId,
  settings,
  stock,
  setStock,
  products,
  setProducts,
}: {
  sellerId: string;
  settings: SellerSettings;
  stock: CardStock[];
  setStock: React.Dispatch<React.SetStateAction<CardStock[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}) {
  const [publishMode, setPublishMode] = useState<"cards" | "products">("cards");
  const [loadMode, setLoadMode] = useState<"list" | "range">("list");
  const [cardList, setCardList] = useState("1 1 13 18 19 880 881 881 881 881 881 880 15 68 1275 951 855 855 855");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("12");
  const [except, setExcept] = useState("4, 7");
  const [prices, setPrices] = useState<Record<CardKind, number>>(() => readPublishPrices(sellerId, settings));
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [publishedMessage, setPublishedMessage] = useState("");
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState<Product["category"]>("lote");
  const [productDescription, setProductDescription] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [productPrice, setProductPrice] = useState(0);
  const [productImageUrl, setProductImageUrl] = useState("");

  const parsedCards = useMemo(() => loadMode === "list" ? parseCardList(cardList) : parseRange(from, to, except), [cardList, except, from, loadMode, to]);
  const variantRows = useMemo(() => {
    const occurrences = new Map<string, number>();
    return parsedCards.flatMap((number) => {
      if (!needsVariantChoice(number)) return [];
      const occurrence = (occurrences.get(number) ?? 0) + 1;
      occurrences.set(number, occurrence);
      return [{ number, key: `${number}-${occurrence}` }];
    });
  }, [parsedCards]);
  const commonGroups = useMemo(() => groupNumbers(parsedCards.filter((number) => !needsVariantChoice(number))), [parsedCards]);

  useEffect(() => {
    setVariantDrafts((current) => {
      const next: Record<string, VariantDraft> = {};
      variantRows.forEach(({ number, key }) => {
        const existing = current[key];
        const kind = existing?.kind ?? getDefaultKind(number);
        const colors = getColorOptions(number, kind);
        next[key] = {
          key,
          number,
          kind,
          variant: existing && colors.includes(existing.variant) ? existing.variant : colors[0] ?? "Base",
          quantity: existing?.quantity ?? 1,
          price: existing?.price ?? prices[kind],
        };
      });
      return next;
    });
  }, [prices, variantRows]);

  useEffect(() => {
    setPrices(readPublishPrices(sellerId, settings));
  }, [sellerId, settings]);

  useEffect(() => {
    writePublishPrices(sellerId, prices);
  }, [prices, sellerId]);

  const variantDraftList = variantRows.map(({ key }) => variantDrafts[key]).filter(Boolean);
  const totalCommonQuantity = Object.values(commonGroups).reduce((sum, quantity) => sum + quantity, 0);
  const totalVariantQuantity = variantDraftList.reduce((sum, row) => sum + Math.max(0, row.quantity), 0);
  const totalToPublish = totalCommonQuantity + totalVariantQuantity;

  function updateVariantRow(key: string, patch: Partial<VariantDraft>) {
    setPublishedMessage("");
    setVariantDrafts((current) => {
      const currentRow = current[key];
      if (!currentRow) return current;
      const nextKind = patch.kind ?? currentRow.kind;
      const colors = getColorOptions(currentRow.number, nextKind);
      const nextVariant = patch.kind && !patch.variant ? colors[0] ?? "Base" : patch.variant ?? currentRow.variant;
      return {
        ...current,
        [key]: {
          ...currentRow,
          ...patch,
          kind: nextKind,
          variant: colors.includes(nextVariant) ? nextVariant : colors[0] ?? "Base",
        },
      };
    });
  }

  function publishCards() {
    if (!totalToPublish) return;
    const rowsToPublish = [
      ...Object.entries(commonGroups).map(([number, quantity]) => ({
        number,
        quantity,
        kind: "comun" as CardKind,
        variant: "Base",
        price: prices.comun,
      })),
      ...variantDraftList.filter((row) => row.quantity > 0),
    ];

    setStock((current) => {
      const next = [...current];
      rowsToPublish.forEach((row) => {
        const expansion = getCromerosExpansion(row.number);
        const existingIndex = next.findIndex(
          (item) =>
            item.sellerId === sellerId &&
            item.number === row.number &&
            item.kind === row.kind &&
            item.variant.toLowerCase() === row.variant.toLowerCase() &&
            item.expansion === expansion,
        );
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + row.quantity,
            price: row.price,
          };
          return;
        }
        next.push({
          id: crypto.randomUUID(),
          sellerId,
          number: row.number,
          expansion,
          kind: row.kind,
          variant: row.variant,
          quantity: row.quantity,
          reserved: 0,
          price: row.price,
          special: row.number.endsWith("F") ? "fantasma" : undefined,
        });
      });
      return next;
    });
    setPublishedMessage(`${totalToPublish} cartas publicadas.`);
  }

  function loadProduct() {
    const name = productName.trim();
    if (!name || productQuantity <= 0) return;
    setProducts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sellerId,
        name,
        category: productCategory,
        description: productDescription.trim() || "Producto publicado sin descripción.",
        quantity: Math.max(1, productQuantity),
        price: Math.max(0, productPrice),
        imageUrl: productImageUrl.trim() || defaultImageUrl,
      },
    ]);
    setProductName("");
    setProductDescription("");
    setProductQuantity(1);
    setProductPrice(0);
    setProductImageUrl("");
  }

  return (
    <div className="space-y-5">
      <section className="tool-surface publish-hero">
        <div>
          <p className="eyebrow">Publicar</p>
          <h2 className="panel-title">¿Qué vas a poner a la venta?</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Usá Cartas para unidades sueltas y Productos para cajas, lotes, figuras, tomos o una expansión completa.</p>
          <p className="mt-2 text-xs font-bold text-[var(--muted)]">Al publicar, sumás el producto a tu stock disponible para que los compradores puedan agregarlo al carrito.</p>
        </div>
        <div className="publish-mode-tabs">
          <button className={clsx(publishMode === "cards" && "active")} onClick={() => setPublishMode("cards")}>
            <Layers3 size={18} />
            Cartas
          </button>
          <button className={clsx(publishMode === "products" && "active")} onClick={() => setPublishMode("products")}>
            <Package size={18} />
            Productos
          </button>
        </div>
      </section>

      {publishMode === "cards" ? (
        <div className="publish-wizard-grid">
          <section className="tool-surface h-fit">
            <p className="eyebrow">Paso 1</p>
            <h2 className="panel-title">{loadMode === "list" ? "Pegá sólo números" : "Elegí un rango"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Las cartas comunes se agrupan solas. Si una carta puede tener variante, aparece en la tabla para completar.</p>
            <div className="mt-4 grid gap-3">
              <div className="segmented">
                <button className={clsx(loadMode === "list" && "active")} onClick={() => setLoadMode("list")}>Lista</button>
                <button className={clsx(loadMode === "range" && "active")} onClick={() => setLoadMode("range")}>Rango</button>
              </div>
              {loadMode === "list" ? (
                <label className="field">
                  <span>Lista de cartas</span>
                  <textarea rows={8} value={cardList} onChange={(event) => setCardList(event.target.value)} />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="field"><span>Desde</span><input value={from} onChange={(event) => setFrom(event.target.value)} /></label>
                  <label className="field"><span>Hasta</span><input value={to} onChange={(event) => setTo(event.target.value)} /></label>
                  <label className="field col-span-2"><span>Excepto</span><input value={except} onChange={(event) => setExcept(event.target.value)} /></label>
                </div>
              )}
              <div className="publish-price-grid">
                <label className="field"><span>Precio común</span><input type="number" min={0} value={prices.comun} onChange={(event) => setPrices((current) => ({ ...current, comun: Math.max(0, Number(event.target.value)) }))} /></label>
                <label className="field"><span>Precio fluor</span><input type="number" min={0} value={prices.fluor} onChange={(event) => setPrices((current) => ({ ...current, fluor: Math.max(0, Number(event.target.value)) }))} /></label>
                <label className="field"><span>Precio holo</span><input type="number" min={0} value={prices.holo} onChange={(event) => setPrices((current) => ({ ...current, holo: Math.max(0, Number(event.target.value)) }))} /></label>
              </div>
            </div>
          </section>

          <aside className="tool-surface h-fit">
            <p className="eyebrow">Ayuda de carga</p>
            <div className="publish-tips">
              <span>Lista: pegá números repetidos o separados por espacios, comas o saltos de línea.</span>
              <span>Rango: usá Desde/Hasta y cargá excepciones si faltan cartas.</span>
              <span>Las cartas con variantes aparecen abajo para completar color y precio.</span>
              <span>{totalCommonQuantity} comunes, {variantRows.length} variantes, {totalToPublish} total.</span>
            </div>
          </aside>

          <section className="tool-surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Paso 2</p>
                <h3>Completá variantes</h3>
              </div>
              <span>{variantRows.length} filas</span>
            </div>
            <div className="variant-sheet">
              <div className="variant-sheet-row header">
                <span>N° carta</span>
                <span>Variante</span>
                <span>Color variante</span>
                <span>Cantidad</span>
                <span>Precio unitario</span>
              </div>
              {variantDraftList.map((row) => (
                <div key={row.key} className="variant-sheet-row">
                  <strong>
                    {row.number}
                    <small>{getCromerosExpansion(row.number)}</small>
                  </strong>
                  <select value={row.kind} onChange={(event) => updateVariantRow(row.key, { kind: event.target.value as CardKind })}>
                    {getKindOptions(row.number).map((option) => <option key={option} value={option}>{kindText(option)}</option>)}
                  </select>
                  <select value={row.variant} onChange={(event) => updateVariantRow(row.key, { variant: event.target.value })}>
                    {getColorOptions(row.number, row.kind).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <input type="number" min={1} value={row.quantity} onChange={(event) => updateVariantRow(row.key, { quantity: Math.max(1, Number(event.target.value)) })} />
                  <input type="number" min={0} value={row.price} onChange={(event) => updateVariantRow(row.key, { price: Math.max(0, Number(event.target.value)) })} />
                </div>
              ))}
              {!variantDraftList.length && <p className="empty">No hay cartas con variantes en la lista. Podés publicar las comunes directamente.</p>}
            </div>
            <div className="publish-sheet-footer">
              {publishedMessage && <span className="save-feedback">{publishedMessage}</span>}
              <button className="primary-button" onClick={publishCards} disabled={!totalToPublish}>
                <PackagePlus size={18} />
                Publicar {totalToPublish} cartas
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="tool-surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Productos y lotes</p>
                <h3 className="panel-title">Publicar algo que se vende como unidad</h3>
              </div>
              <span>{products.length} productos</span>
            </div>
            <div className="product-load-grid mt-4">
              <label className="field"><span>Producto</span><input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Expansión completa con caja" maxLength={80} /></label>
              <label className="field">
                <span>Categoría</span>
                <select value={productCategory} onChange={(event) => setProductCategory(event.target.value as Product["category"])}>
                  <option value="lote">Lote</option>
                  <option value="caja">Caja</option>
                  <option value="figura">Figura</option>
                  <option value="tomo">Tomo</option>
                  <option value="figurita">Figurita</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label className="field"><span>Cantidad</span><input type="number" min={1} value={productQuantity} onChange={(event) => setProductQuantity(Number(event.target.value))} /></label>
              <label className="field"><span>Precio</span><input type="number" min={0} value={productPrice} onChange={(event) => setProductPrice(Number(event.target.value))} /></label>
              <label className="field product-load-wide"><span>Descripción</span><textarea rows={3} value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Ej: expansión completa, incluye caja original, estado general, si faltan o sobran cartas..." maxLength={600} /></label>
              <label className="field product-load-wide"><span>URL de imagen</span><input value={productImageUrl} onChange={(event) => setProductImageUrl(event.target.value)} placeholder="https://..." /></label>
              <button className="primary-button product-load-action" onClick={loadProduct} disabled={!productName.trim()}>
                <PackagePlus size={18} />
                Publicar producto
              </button>
            </div>
          </section>
          <aside className="tool-surface h-fit">
            <p className="eyebrow">Cuándo usar Productos</p>
            <div className="publish-tips">
              <span>Expansión completa con caja.</span>
              <span>Lote de cartas que no se vende una por una.</span>
              <span>Figura, tomo, caja, poster o figurita.</span>
              <span>Producto con una foto y descripción propia.</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function readPublishPrices(sellerId: string, settings: SellerSettings): Record<CardKind, number> {
  const storageKey = `dbsm.publishPrices.${sellerId}`;
  const fallback = {
    comun: settings.defaultCommonPrice || defaultPrices.comun,
    fluor: settings.defaultFluorPrice || defaultPrices.fluor,
    holo: settings.defaultHoloPrice || defaultPrices.holo,
  };

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function writePublishPrices(sellerId: string, prices: Record<CardKind, number>) {
  try {
    window.localStorage.setItem(`dbsm.publishPrices.${sellerId}`, JSON.stringify(prices));
  } catch {
    // The form still works with in-memory prices if localStorage is unavailable.
  }
}

function kindText(kind: CardKind) {
  if (kind === "comun") return "Común";
  if (kind === "fluor") return "Fluor";
  return "Holo";
}
