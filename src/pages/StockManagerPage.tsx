import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Layers3, Package, PackagePlus } from "lucide-react";
import { getColorOptions, getCromerosExpansion, getDefaultKind, getKindOptions, isKnownCromerosCardNumber, needsVariantChoice, variantDisplayLabel, type VariantDraft } from "../data/cromerosCatalog";
import type { CardKind, CardStock, Product, PublishCardInput, PublishProductInput, SellerSettings } from "../lib/types";
import { groupNumbers, parseCardList, parseRange } from "../lib/helpers";
import { cleanPlainText, DEFAULT_PRODUCT_IMAGE_URL, sanitizeExternalImageUrl } from "../lib/security";

const defaultPrices: Record<CardKind, number> = { comun: 400, fluor: 700, holo: 2000 };

export function StockManagerPage({
  sellerId,
  settings,
  stock,
  setStock,
  products,
  setProducts,
  onPublishCards,
  onPublishProduct,
  onRegisterExpense,
}: {
  sellerId: string;
  settings: SellerSettings;
  stock: CardStock[];
  setStock: React.Dispatch<React.SetStateAction<CardStock[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onPublishCards?: (rows: PublishCardInput[]) => Promise<CardStock[] | null>;
  onPublishProduct?: (product: PublishProductInput) => Promise<Product | null>;
  onRegisterExpense?: (amount: number, note: string) => void;
}) {
  const [publishMode, setPublishMode] = useState<"cards" | "products">("cards");
  const [loadMode, setLoadMode] = useState<"list" | "range">("list");
  const [cardList, setCardList] = useState("");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("12");
  const [except, setExcept] = useState("4, 7");
  const [prices, setPrices] = useState<Record<CardKind, number>>(() => readPublishPrices(sellerId, settings));
  const [cardsPurchaseCost, setCardsPurchaseCost] = useState(0);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [bulkKind, setBulkKind] = useState<CardKind>("holo");
  const [bulkVariant, setBulkVariant] = useState("");
  const [publishedMessage, setPublishedMessage] = useState("");
  const [publishError, setPublishError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState<Product["category"]>("lote");
  const [productDescription, setProductDescription] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [productPrice, setProductPrice] = useState("0");
  const [productPurchaseCost, setProductPurchaseCost] = useState("0");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  const parsedCards = useMemo(() => loadMode === "list" ? parseCardList(cardList) : parseRange(from, to, except), [cardList, except, from, loadMode, to]);
  const invalidCardNumbers = useMemo(() => uniqueSortedNumbers(parsedCards.filter((number) => !isKnownCromerosCardNumber(number))), [parsedCards]);
  const validParsedCards = useMemo(() => parsedCards.filter((number) => isKnownCromerosCardNumber(number)), [parsedCards]);
  const variantRows = useMemo(() => {
    const occurrences = new Map<string, number>();
    return validParsedCards.flatMap((number) => {
      if (!needsVariantChoice(number)) return [];
      const occurrence = (occurrences.get(number) ?? 0) + 1;
      occurrences.set(number, occurrence);
      return [{ number, key: `${number}-${occurrence}` }];
    });
  }, [validParsedCards]);
  const commonGroups = useMemo(() => groupNumbers(validParsedCards.filter((number) => !needsVariantChoice(number))), [validParsedCards]);

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
          price: prices[kind],
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
  const bulkVariantOptions = useMemo(
    () => Array.from(new Set(variantDraftList.flatMap((row) => getColorOptions(row.number, row.kind)))),
    [variantDraftList],
  );
  const bulkVariantValue = bulkVariantOptions.includes(bulkVariant) ? bulkVariant : bulkVariantOptions[0] ?? "";
  const bulkKindOptions = useMemo(
    () => Array.from(new Set(variantDraftList.flatMap((row) => getKindOptions(row.number)))),
    [variantDraftList],
  );
  const bulkKindValue = bulkKindOptions.includes(bulkKind) ? bulkKind : bulkKindOptions[0] ?? "holo";

  function updateVariantRow(key: string, patch: Partial<VariantDraft>) {
    setPublishedMessage("");
    setPublishError("");
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

  function applyBulkVariant() {
    if (!bulkVariantValue) return;
    setPublishedMessage("");
    setPublishError("");
    setVariantDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, row]) => {
          const options = getColorOptions(row.number, row.kind);
          return [key, options.includes(bulkVariantValue) ? { ...row, variant: bulkVariantValue } : row];
        }),
      ),
    );
  }

  function applyBulkKind() {
    if (!bulkKindValue) return;
    setPublishedMessage("");
    setPublishError("");
    setVariantDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, row]) => {
          const kindOptions = getKindOptions(row.number);
          if (!kindOptions.includes(bulkKindValue)) return [key, row];
          const colorOptions = getColorOptions(row.number, bulkKindValue);
          return [
            key,
            {
              ...row,
              kind: bulkKindValue,
              variant: colorOptions.includes(row.variant) ? row.variant : colorOptions[0] ?? "Base",
              price: prices[bulkKindValue],
            },
          ];
        }),
      ),
    );
  }

  async function publishCards() {
    if (!totalToPublish) return;
    setPublishedMessage("");
    setPublishError("");
    if (invalidCardNumbers.length) {
      setPublishError(`No publiqué nada porque hay números fuera del catálogo Cromeros: ${formatInvalidNumbers(invalidCardNumbers)}.`);
      return;
    }
    const rowsToPublish: PublishCardInput[] = [
      ...Object.entries(commonGroups).map(([number, quantity]) => ({
        number,
        expansion: getCromerosExpansion(number),
        quantity,
        kind: "comun" as CardKind,
        variant: "Base",
        price: prices.comun,
      })),
      ...variantDraftList
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          number: row.number,
          expansion: getCromerosExpansion(row.number),
          kind: row.kind,
          variant: row.variant,
          quantity: row.quantity,
          price: row.price,
        })),
    ];

    setIsPublishing(true);
    const savedRows = onPublishCards ? await onPublishCards(rowsToPublish) : null;
    setIsPublishing(false);

    if (savedRows) {
      setStock((current) => [
        ...current.filter((item) => item.sellerId !== sellerId),
        ...savedRows,
      ]);
      setPublishedMessage(`${totalToPublish} cartas publicadas.`);
      setCardList("");
      setVariantDrafts({});
      if (cardsPurchaseCost > 0) {
        onRegisterExpense?.(cardsPurchaseCost, `Costo de compra: ${totalToPublish} cartas`);
        setCardsPurchaseCost(0);
      }
      return;
    }

    if (onPublishCards) {
      setPublishError("No pude publicar las cartas. Revisá la conexión y probá de nuevo.");
      return;
    }

    setStock((current) => {
      const next = [...current];
      rowsToPublish.forEach((row) => {
        const existingIndex = next.findIndex(
          (item) =>
            item.sellerId === sellerId &&
            item.number === row.number &&
            item.kind === row.kind &&
            item.variant.toLowerCase() === row.variant.toLowerCase() &&
            item.expansion === row.expansion,
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
          expansion: row.expansion,
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
    setCardList("");
    setVariantDrafts({});
    if (cardsPurchaseCost > 0) {
      onRegisterExpense?.(cardsPurchaseCost, `Costo de compra: ${totalToPublish} cartas`);
      setCardsPurchaseCost(0);
    }
  }

  async function loadProduct() {
    const name = cleanPlainText(productName, 80);
    if (!name || productQuantity <= 0) return;
    setPublishedMessage("");
    setPublishError("");
    const purchaseCost = parseMoneyInput(productPurchaseCost);

    const productToPublish: PublishProductInput = {
      name,
      category: productCategory,
      description: cleanPlainText(productDescription, 600) || "Producto publicado sin descripción.",
      quantity: Math.max(1, productQuantity),
      reserved: 0,
      price: parseMoneyInput(productPrice),
      imageUrl: sanitizeExternalImageUrl(productImageUrl, DEFAULT_PRODUCT_IMAGE_URL),
      imageFile: productImageFile,
      purchaseCost,
    };

    setIsPublishing(true);
    const savedProduct = onPublishProduct ? await onPublishProduct(productToPublish) : null;
    setIsPublishing(false);

    if (onPublishProduct && !savedProduct) {
      setPublishError("No pude publicar el producto. Revisá la conexión, la foto y probá de nuevo.");
      return;
    }

    setProducts((current) => [
      ...current,
      savedProduct ?? {
        id: crypto.randomUUID(),
        sellerId,
        name: productToPublish.name,
        category: productToPublish.category,
        description: productToPublish.description,
        quantity: productToPublish.quantity,
        reserved: productToPublish.reserved,
        price: productToPublish.price,
        imageUrl: productToPublish.imageUrl,
      },
    ]);
    if (purchaseCost > 0) onRegisterExpense?.(purchaseCost, `Costo de compra: ${name}`);
    setPublishedMessage(`Producto "${name}" publicado.`);
    setProductName("");
    setProductDescription("");
    setProductQuantity(1);
    setProductPrice("0");
    setProductPurchaseCost("0");
    setProductImageUrl("");
    setProductImageFile(null);
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
                <label className="field"><span>Costo de compra</span><input type="number" min={0} value={cardsPurchaseCost} onChange={(event) => setCardsPurchaseCost(Math.max(0, Number(event.target.value)))} /></label>
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
              <span>Catálogo Cromeros: cartas 1 a 1936.</span>
            </div>
            {invalidCardNumbers.length > 0 && (
              <p className="form-error mt-3">
                Revisá estos números: {formatInvalidNumbers(invalidCardNumbers)}. No existen en el catálogo Cromeros.
              </p>
            )}
          </aside>

          <section className="tool-surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Paso 2</p>
                <h3>Completá variantes</h3>
              </div>
              <span>{variantRows.length} filas</span>
            </div>
            <div className="bulk-variant-tool">
              <label className="field compact-field">
                <span>Tipo masivo</span>
                <select value={bulkKindValue} onChange={(event) => setBulkKind(event.target.value as CardKind)} disabled={!bulkKindOptions.length}>
                  {bulkKindOptions.map((option) => <option key={option} value={option}>{kindText(option)}</option>)}
                </select>
              </label>
              <button className="secondary-button compact" onClick={applyBulkKind} disabled={!bulkKindOptions.length}>
                Aplicar tipo a todas compatibles
              </button>
              <label className="field compact-field">
                <span>Variante masiva</span>
                <select value={bulkVariantValue} onChange={(event) => setBulkVariant(event.target.value)} disabled={!bulkVariantOptions.length}>
                  {bulkVariantOptions.map((option) => <option key={option} value={option}>{variantDisplayLabel(option)}</option>)}
                </select>
              </label>
              <button className="secondary-button compact" onClick={applyBulkVariant} disabled={!bulkVariantValue}>
                Aplicar a todas compatibles
              </button>
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
                    {getColorOptions(row.number, row.kind).map((option) => <option key={option} value={option}>{variantDisplayLabel(option)}</option>)}
                  </select>
                  <input type="number" min={1} value={row.quantity} onChange={(event) => updateVariantRow(row.key, { quantity: Math.max(1, Number(event.target.value)) })} />
                  <input type="number" min={0} value={row.price} onChange={(event) => updateVariantRow(row.key, { price: Math.max(0, Number(event.target.value)) })} />
                </div>
              ))}
              {!variantDraftList.length && <p className="empty">No hay cartas con variantes en la lista. Podés publicar las comunes directamente.</p>}
            </div>
            <div className="publish-sheet-footer">
              {publishedMessage && <span className="save-feedback">{publishedMessage}</span>}
              {publishError && <span className="save-feedback error">{publishError}</span>}
              <button className="primary-button" onClick={publishCards} disabled={!totalToPublish || invalidCardNumbers.length > 0 || isPublishing}>
                <PackagePlus size={18} />
                {isPublishing ? "Publicando..." : `Publicar ${totalToPublish} cartas`}
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
              <label className="field"><span>Precio</span><input type="number" min={0} value={productPrice} onChange={(event) => setProductPrice(normalizeMoneyInput(event.target.value))} /></label>
              <label className="field"><span>Costo de compra</span><input type="number" min={0} value={productPurchaseCost} onChange={(event) => setProductPurchaseCost(normalizeMoneyInput(event.target.value))} /></label>
              <label className="field product-load-wide"><span>Descripción</span><textarea rows={3} value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Ej: expansión completa, incluye caja original, estado general, si faltan o sobran cartas..." maxLength={600} /></label>
              <label className="field"><span>Foto del producto</span><input type="file" accept="image/*" onChange={(event) => setProductImageFile(event.target.files?.[0] ?? null)} /></label>
              <label className="field"><span>URL de imagen</span><input value={productImageUrl} onChange={(event) => setProductImageUrl(event.target.value)} placeholder="https://..." maxLength={2048} disabled={Boolean(productImageFile)} /></label>
              <button className="primary-button product-load-action" onClick={loadProduct} disabled={!productName.trim() || isPublishing}>
                <PackagePlus size={18} />
                {isPublishing ? "Publicando..." : "Publicar producto"}
              </button>
            </div>
            <div className="publish-sheet-footer">
              {publishedMessage && <span className="save-feedback">{publishedMessage}</span>}
              {publishError && <span className="save-feedback error">{publishError}</span>}
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

function normalizeMoneyInput(value: string) {
  if (value === "") return "";
  const normalized = value.replace(",", ".");
  const [rawInteger, ...rawDecimals] = normalized.split(".");
  const integerDigits = rawInteger.replace(/\D/g, "");
  const decimalDigits = rawDecimals.join("").replace(/\D/g, "");
  const integer = (integerDigits || "0").replace(/^0+(?=\d)/, "");
  return rawDecimals.length ? `${integer}.${decimalDigits}` : integer;
}

function parseMoneyInput(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
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

function uniqueSortedNumbers(numbers: string[]) {
  return Array.from(new Set(numbers)).sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
}

function formatInvalidNumbers(numbers: string[]) {
  const visible = numbers.slice(0, 12).join(", ");
  const remaining = numbers.length - 12;
  return remaining > 0 ? `${visible} y ${remaining} más` : visible;
}
