import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { getColorOptions } from "../data/cromerosCatalog";
import type { CardKind, CardStock, Product } from "../lib/types";
import { formatMoney, kindLabel } from "../lib/helpers";
import { SEARCH_FILTERS } from "../lib/limits";
import { sortCardStock } from "../lib/sorting";

const productCategories: Array<{ value: Product["category"]; label: string }> = [
  { value: "lote", label: "Lote" },
  { value: "caja", label: "Caja" },
  { value: "figura", label: "Figura" },
  { value: "tomo", label: "Tomo" },
  { value: "figurita", label: "Figurita" },
  { value: "otro", label: "Otro" },
];

export function StockManagementPage({
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
  const [draftStock, setDraftStock] = useState<CardStock[]>(stock);
  const [draftProducts, setDraftProducts] = useState<Product[]>(products);
  const [savedMessage, setSavedMessage] = useState("");
  const [expansionFilter, setExpansionFilter] = useState("");

  useEffect(() => setDraftStock(stock), [stock]);
  useEffect(() => setDraftProducts(products), [products]);

  const cardsDirty = useMemo(() => JSON.stringify(draftStock) !== JSON.stringify(stock), [draftStock, stock]);
  const productsDirty = useMemo(() => JSON.stringify(draftProducts) !== JSON.stringify(products), [draftProducts, products]);
  const stockValue = draftStock.reduce((sum, item) => sum + item.quantity * item.price, 0) + draftProducts.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const visibleStock = useMemo(
    () => [...draftStock]
      .filter((item) => !expansionFilter || item.expansion === expansionFilter)
      .sort(sortCardStock),
    [draftStock, expansionFilter],
  );
  const sortedProducts = useMemo(() => [...draftProducts].sort((a, b) => a.name.localeCompare(b.name)), [draftProducts]);

  function updateCard(itemId: string, patch: Partial<Pick<CardStock, "quantity" | "price" | "kind" | "variant">>) {
    setSavedMessage("");
    setDraftStock((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item));
  }

  function updateProduct(productId: string, patch: Partial<Pick<Product, "quantity" | "price" | "name" | "category" | "description" | "imageUrl">>) {
    setSavedMessage("");
    setDraftProducts((current) => current.map((product) => product.id === productId ? { ...product, ...patch } : product));
  }

  function discardChanges() {
    setDraftStock(stock);
    setDraftProducts(products);
    setSavedMessage("");
  }

  function saveCardChanges() {
    setStock((current) => [
      ...current.filter((item) => item.sellerId !== sellerId),
      ...draftStock.map((item) => ({ ...item, sellerId })),
    ]);
    setSavedMessage("Cartas guardadas.");
  }

  function saveProductChanges() {
    setProducts((current) => [
      ...current.filter((item) => item.sellerId !== sellerId),
      ...draftProducts.map((item) => ({ ...item, sellerId })),
    ]);
    setSavedMessage("Productos guardados.");
  }

  return (
    <div className="space-y-5">
      <section className="tool-surface publish-hero">
        <div>
          <p className="eyebrow">Gestionar</p>
          <h2 className="panel-title">Editar stock publicado</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Ajusta cantidades, precios, variantes o productos. Cada tabla se guarda por separado.</p>
        </div>
      </section>

      <section className="stock-summary-grid">
        <div className="metric"><div><p>Cartas publicadas</p><strong>{draftStock.length}</strong></div></div>
        <div className="metric"><div><p>Productos publicados</p><strong>{draftProducts.length}</strong></div></div>
        <div className="metric"><div><p>Valor cargado</p><strong>{formatMoney(stockValue)}</strong></div></div>
      </section>
      {savedMessage && <p className="save-feedback">{savedMessage}</p>}

      <section className="tool-surface">
        <div className="section-heading">
          <div>
            <h3>Cartas</h3>
            <span>{visibleStock.length} visibles</span>
          </div>
          <div className="table-actions">
            <label className="field compact-field">
              <span>Expansion</span>
              <select value={expansionFilter} onChange={(event) => setExpansionFilter(event.target.value)}>
                <option value="">Todas</option>
                {SEARCH_FILTERS.expansions.filter((item) => item !== "todas").map((expansion) => <option key={expansion} value={expansion}>{expansion}</option>)}
              </select>
            </label>
            <button className="secondary-button compact" onClick={discardChanges} disabled={!cardsDirty && !productsDirty}>
              <RotateCcw size={16} />
              Descartar
            </button>
            <button className="primary-button compact" onClick={saveCardChanges} disabled={!cardsDirty}>
              <Save size={16} />
              Guardar cambios
            </button>
          </div>
        </div>
        <div className="stock-table">
          <div className="manage-row card-manage-row manage-row-header">
            <span>N° carta</span>
            <span>Variante</span>
            <span>Color variante</span>
            <span>Cantidad</span>
            <span>Precio</span>
            <span></span>
          </div>
          {visibleStock.map((item) => (
            <div key={item.id} className="manage-row card-manage-row">
              <strong>{item.number}</strong>
              <select value={item.kind} onChange={(event) => updateCard(item.id, { kind: event.target.value as CardKind })} aria-label={`Variante carta ${item.number}`}>
                <option value="comun">{kindLabel.comun}</option>
                <option value="fluor">{kindLabel.fluor}</option>
                <option value="holo">{kindLabel.holo}</option>
              </select>
              <select value={item.variant} onChange={(event) => updateCard(item.id, { variant: event.target.value })}>
                {getCardColorOptions(item).map((variant) => <option key={variant} value={variant}>{variant}</option>)}
              </select>
              <input type="number" min={0} value={item.quantity} onChange={(event) => updateCard(item.id, { quantity: Math.max(0, Number(event.target.value)) })} />
              <input type="number" min={0} value={item.price} onChange={(event) => updateCard(item.id, { price: Math.max(0, Number(event.target.value)) })} />
              <button className="ghost-icon" onClick={() => setDraftStock((current) => current.filter((row) => row.id !== item.id))} aria-label="Eliminar carta">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!draftStock.length && <p className="empty">Todavia no hay cartas publicadas.</p>}
        </div>
      </section>

      <section className="tool-surface">
        <div className="section-heading">
          <h3>Productos</h3>
          <div className="table-actions">
            <button className="secondary-button compact" onClick={discardChanges} disabled={!cardsDirty && !productsDirty}>
              <RotateCcw size={16} />
              Descartar
            </button>
            <button className="primary-button compact" onClick={saveProductChanges} disabled={!productsDirty}>
              <Save size={16} />
              Guardar cambios
            </button>
          </div>
        </div>
        <div className="stock-table">
          <div className="manage-row product-manage-row manage-row-header">
            <span>Categoria</span>
            <span>Producto</span>
            <span>Cantidad</span>
            <span>Precio</span>
            <span>Descripcion</span>
            <span>Foto</span>
            <span></span>
          </div>
          {sortedProducts.map((product) => (
            <div key={product.id} className="manage-row product-manage-row">
              <select value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value as Product["category"] })}>
                {productCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <input value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} />
              <input type="number" min={0} value={product.quantity} onChange={(event) => updateProduct(product.id, { quantity: Math.max(0, Number(event.target.value)) })} />
              <input type="number" min={0} value={product.price} onChange={(event) => updateProduct(product.id, { price: Math.max(0, Number(event.target.value)) })} />
              <input value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })} />
              <input value={product.imageUrl} onChange={(event) => updateProduct(product.id, { imageUrl: event.target.value })} />
              <button className="ghost-icon" onClick={() => setDraftProducts((current) => current.filter((row) => row.id !== product.id))} aria-label="Eliminar producto">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!draftProducts.length && <p className="empty">Todavia no hay productos publicados.</p>}
        </div>
      </section>
    </div>
  );
}

function getCardColorOptions(item: CardStock) {
  const options = getColorOptions(item.number, item.kind);
  return options.includes(item.variant) ? options : [item.variant, ...options];
}
