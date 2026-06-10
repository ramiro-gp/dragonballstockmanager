import { useMemo, useState } from "react";
import clsx from "clsx";
import { PackagePlus } from "lucide-react";
import type { CardKind, CardStock, Product } from "../lib/types";
import { availableQuantity, formatMoney, groupNumbers, kindLabel, parseCardList, parseRange } from "../lib/helpers";

type AssistedRow = {
  key: string;
  number: string;
  quantity: number;
  kind: CardKind;
  variant: string;
  expansion: string;
  price: number;
};

type RowEdit = Partial<Pick<AssistedRow, "quantity" | "kind" | "variant" | "expansion" | "price">>;

type VariantOverride = {
  kind?: CardKind;
  variant?: string;
  price?: number;
};

export function StockManagerPage({
  sellerId,
  stock,
  setStock,
  products,
  setProducts,
}: {
  sellerId: string;
  stock: CardStock[];
  setStock: React.Dispatch<React.SetStateAction<CardStock[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}) {
  const [mode, setMode] = useState<"list" | "range">("list");
  const [list, setList] = useState("1 2 2 3 504F");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("12");
  const [except, setExcept] = useState("4, 7");
  const [kind, setKind] = useState<CardKind>("comun");
  const [variant, setVariant] = useState("Base");
  const [expansion, setExpansion] = useState("Sin expansión");
  const [variantOverrides, setVariantOverrides] = useState("1110: verde\n1134: glitter\n504F: fantasma");
  const [price, setPrice] = useState(300);
  const [rowEdits, setRowEdits] = useState<Record<string, RowEdit>>({});
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState<Product["category"]>("figura");
  const [productDescription, setProductDescription] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [productPrice, setProductPrice] = useState(0);
  const [productImageUrl, setProductImageUrl] = useState("");

  const previewNumbers = mode === "list" ? parseCardList(list) : parseRange(from, to, except);
  const grouped = groupNumbers(previewNumbers);
  const overrideMap = useMemo(() => parseVariantOverrides(variantOverrides), [variantOverrides]);
  const assistedRows = useMemo(() => {
    return Object.entries(grouped).map(([number, quantity]) => {
      const override = overrideMap.get(number.toUpperCase());
      const baseKind = override?.kind ?? kind;
      const baseVariant = override?.variant ?? variant;
      const basePrice = override?.price ?? price;
      const baseRow: AssistedRow = {
        key: `${number}-${baseKind}-${baseVariant.toLowerCase()}`,
        number,
        quantity,
        kind: baseKind,
        variant: baseVariant,
        expansion,
        price: basePrice,
      };
      const edit = rowEdits[baseRow.key] ?? {};
      return { ...baseRow, ...edit };
    });
  }, [expansion, grouped, kind, overrideMap, price, rowEdits, variant]);

  function loadStock() {
    const rows = assistedRows.filter((row) => row.quantity > 0);
    setStock((current) => {
      const next = [...current];
      rows.forEach((row) => {
        const existingIndex = next.findIndex(
          (item) =>
            item.sellerId === sellerId &&
            item.number === row.number &&
            item.kind === row.kind &&
            item.variant.toLowerCase() === row.variant.toLowerCase() &&
            item.expansion.toLowerCase() === row.expansion.toLowerCase(),
        );
        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + row.quantity, price: row.price };
        } else {
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
            special: row.number.endsWith("F") || row.variant.toLowerCase().includes("fantasma") ? "fantasma" : undefined,
          });
        }
      });
      return next;
    });
  }

  function updatePreviewRow(key: string, edit: RowEdit) {
    setRowEdits((current) => ({ ...current, [key]: { ...current[key], ...edit } }));
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
        imageUrl: productImageUrl.trim() || "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=900&q=80",
      },
    ]);
    setProductName("");
    setProductDescription("");
    setProductQuantity(1);
    setProductPrice(0);
    setProductImageUrl("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="tool-surface h-fit">
        <div className="segmented">
          <button className={clsx(mode === "list" && "active")} onClick={() => setMode("list")}>Lista</button>
          <button className={clsx(mode === "range" && "active")} onClick={() => setMode("range")}>Rango</button>
        </div>
        <div className="mt-4 grid gap-3">
          {mode === "list" ? (
            <label className="field"><span>Cartas</span><textarea rows={5} value={list} onChange={(event) => setList(event.target.value)} /></label>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="field"><span>Desde</span><input value={from} onChange={(event) => setFrom(event.target.value)} /></label>
              <label className="field"><span>Hasta</span><input value={to} onChange={(event) => setTo(event.target.value)} /></label>
              <label className="field col-span-2"><span>Excepto</span><input value={except} onChange={(event) => setExcept(event.target.value)} /></label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="field"><span>Tipo</span><select value={kind} onChange={(event) => setKind(event.target.value as CardKind)}><option value="comun">Común</option><option value="fluor">Fluor</option><option value="holo">Holo</option></select></label>
            <label className="field"><span>Variante</span><input value={variant} onChange={(event) => setVariant(event.target.value)} /></label>
          </div>
          <label className="field"><span>Expansión</span><input value={expansion} onChange={(event) => setExpansion(event.target.value)} maxLength={80} /></label>
          <label className="field"><span>Precio default</span><input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
          <button className="primary-button" onClick={loadStock} disabled={!assistedRows.length}><PackagePlus size={18} />Cargar {previewNumbers.length} cartas</button>
        </div>
      </section>

      <section className="tool-surface">
        <div className="section-heading"><h3>Previsualización editable</h3><span>{assistedRows.length} variantes</span></div>
        <div className="assisted-table">
          <div className="assisted-row header">
            <span>Número</span>
            <span>Cantidad</span>
            <span>Tipo</span>
            <span>Variante</span>
            <span>Expansión</span>
            <span>Precio</span>
          </div>
          {assistedRows.map((row) => (
            <div key={row.key} className="assisted-row">
              <strong>{row.number}</strong>
              <input type="number" min={1} value={row.quantity} onChange={(event) => updatePreviewRow(row.key, { quantity: Number(event.target.value) })} />
              <select value={row.kind} onChange={(event) => updatePreviewRow(row.key, { kind: event.target.value as CardKind })}>
                <option value="comun">Común</option>
                <option value="fluor">Fluor</option>
                <option value="holo">Holo</option>
              </select>
              <input value={row.variant} onChange={(event) => updatePreviewRow(row.key, { variant: event.target.value })} />
              <input value={row.expansion} onChange={(event) => updatePreviewRow(row.key, { expansion: event.target.value })} />
              <input type="number" min={0} value={row.price} onChange={(event) => updatePreviewRow(row.key, { price: Number(event.target.value) })} />
            </div>
          ))}
          {!assistedRows.length && <p className="empty">Pegá una lista o elegí un rango para ver la previsualización.</p>}
        </div>
        <div className="section-heading mt-6"><h3>Stock actual</h3><span>{stock.length} variantes</span></div>
        <div className="stock-table">
          {stock.map((item) => <div key={item.id} className="stock-row"><span>{item.number}</span><span>{kindLabel[item.kind]} · {item.variant}</span><span>x{availableQuantity(item)} / {item.quantity}</span><strong>{formatMoney(item.price)}</strong></div>)}
        </div>
      </section>
      <section className="tool-surface xl:col-span-2">
        <p className="eyebrow">Carga asistida</p>
        <h3 className="panel-title">Variantes sin 500 clicks</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Pegás todo el lote como común/base y después sólo las excepciones. Formatos útiles:
          1110: verde, 1134: holo glitter 1500, 504F: fantasma.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_280px]">
          <label className="field">
            <span>Excepciones de variante</span>
            <textarea rows={6} value={variantOverrides} onChange={(event) => setVariantOverrides(event.target.value)} />
          </label>
          <div className="assistant-summary">
            <strong>Cómo se usa</strong>
            <span>1. Pegás el lote completo.</span>
            <span>2. Elegís default: común/base.</span>
            <span>3. Pegás variantes, tipos o precios especiales.</span>
            <span>4. Ajustás la tabla y confirmás la carga.</span>
          </div>
        </div>
      </section>
      <section className="tool-surface xl:col-span-2">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Otros productos</p>
            <h3 className="panel-title">Publicar productos que no son cartas</h3>
          </div>
          <span>{products.length} productos</span>
        </div>
        <div className="product-load-grid mt-4">
          <label className="field"><span>Nombre</span><input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Figura, tomo, caja, lote..." maxLength={80} /></label>
          <label className="field">
            <span>Categoría</span>
            <select value={productCategory} onChange={(event) => setProductCategory(event.target.value as Product["category"])}>
              <option value="figura">Figura</option>
              <option value="tomo">Tomo</option>
              <option value="caja">Caja</option>
              <option value="lote">Lote</option>
              <option value="figurita">Figurita</option>
            </select>
          </label>
          <label className="field"><span>Cantidad</span><input type="number" min={1} value={productQuantity} onChange={(event) => setProductQuantity(Number(event.target.value))} /></label>
          <label className="field"><span>Precio</span><input type="number" min={0} value={productPrice} onChange={(event) => setProductPrice(Number(event.target.value))} /></label>
          <label className="field product-load-wide"><span>Descripción</span><textarea rows={3} value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Estado, medidas, contenido del lote..." maxLength={600} /></label>
          <label className="field product-load-wide"><span>URL de imagen</span><input value={productImageUrl} onChange={(event) => setProductImageUrl(event.target.value)} placeholder="https://..." /></label>
          <button className="primary-button product-load-action" onClick={loadProduct} disabled={!productName.trim()}>
            <PackagePlus size={18} />
            Publicar producto
          </button>
        </div>
        <div className="stock-table">
          {products.map((product) => (
            <div key={product.id} className="stock-row product-stock-row">
              <span>{product.category}</span>
              <span>{product.name}</span>
              <span>x{product.quantity}</span>
              <strong>{formatMoney(product.price)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function parseVariantOverrides(input: string) {
  return input.split(/\n+/).reduce<Map<string, VariantOverride>>((acc, line) => {
    const match = line.trim().match(/^(\d+F?)\s*[:=-]\s*(.+)$/i);
    if (!match) return acc;
    const number = match[1].toUpperCase();
    const rawValue = match[2].trim();
    const priceMatch = rawValue.match(/(?:\$|\b)(\d{3,})(?!.*\d)/);
    const price = priceMatch ? Number(priceMatch[1]) : undefined;
    const withoutPrice = priceMatch ? rawValue.replace(priceMatch[0], "").trim() : rawValue;
    const lower = withoutPrice.toLowerCase();
    const kind = inferKind(lower);
    const variant = cleanVariant(withoutPrice, kind);
    acc.set(number, { kind, variant, price });
    return acc;
  }, new Map());
}

function inferKind(value: string): CardKind | undefined {
  if (/\bholo\b/.test(value)) return "holo";
  if (/\bfluor\b/.test(value)) return "fluor";
  if (/\bcom[uú]n\b|\bbase\b/.test(value)) return "comun";
  return undefined;
}

function cleanVariant(value: string, kind?: CardKind) {
  const cleaned = value
    .replace(/\b(holo|fluor|com[uú]n)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned) return toTitleCase(cleaned);
  if (kind === "fluor") return "Fluor";
  return "Base";
}

function toTitleCase(value: string) {
  return value.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
