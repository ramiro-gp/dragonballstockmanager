import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { getColorOptions } from "../data/cromerosCatalog";
import type { CardKind, CardStock, Product } from "../lib/types";
import { formatMoney, kindLabel, parseCardList } from "../lib/helpers";
import { SEARCH_FILTERS } from "../lib/limits";
import { sortCardStock } from "../lib/sorting";
import { Pagination } from "../components/shared/Pagination";

const productCategories: Array<{ value: Product["category"]; label: string }> = [
  { value: "lote", label: "Lote" },
  { value: "caja", label: "Caja" },
  { value: "figura", label: "Figura" },
  { value: "tomo", label: "Tomo" },
  { value: "figurita", label: "Figurita" },
  { value: "otro", label: "Otro" },
];

const cardPageSize = 30;

export function StockManagementPage({
  sellerId,
  stock,
  setStock,
  products,
  setProducts,
  onSaveCards,
  onSaveProducts,
}: {
  sellerId: string;
  stock: CardStock[];
  setStock: React.Dispatch<React.SetStateAction<CardStock[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onSaveCards?: (rows: CardStock[]) => Promise<CardStock[] | null>;
  onSaveProducts?: (rows: Product[]) => Promise<Product[] | null>;
}) {
  const [draftStock, setDraftStock] = useState<CardStock[]>(stock);
  const [draftProducts, setDraftProducts] = useState<Product[]>(products);
  const [savedMessage, setSavedMessage] = useState("");
  const [expansionFilter, setExpansionFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [cardPage, setCardPage] = useState(1);

  useEffect(() => setDraftStock(stock), [stock]);
  useEffect(() => setDraftProducts(products), [products]);
  useEffect(() => setSelectedCardIds((current) => current.filter((id) => draftStock.some((item) => item.id === id))), [draftStock]);
  useEffect(() => setCardPage(1), [expansionFilter, kindFilter, cardQuery]);

  const cardsDirty = useMemo(() => JSON.stringify(draftStock) !== JSON.stringify(stock), [draftStock, stock]);
  const productsDirty = useMemo(() => JSON.stringify(draftProducts) !== JSON.stringify(products), [draftProducts, products]);
  const stockValue = draftStock.reduce((sum, item) => sum + item.quantity * item.price, 0) + draftProducts.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const queryNumbers = parseCardList(cardQuery);
  const visibleStock = useMemo(
    () => [...draftStock]
      .filter((item) => !expansionFilter || item.expansion === expansionFilter)
      .filter((item) => !kindFilter || item.kind === kindFilter)
      .filter((item) => !queryNumbers.length || queryNumbers.includes(item.number.toUpperCase()))
      .sort(sortCardStock),
    [draftStock, expansionFilter, kindFilter, queryNumbers],
  );
  const visibleStockPage = visibleStock.slice((cardPage - 1) * cardPageSize, cardPage * cardPageSize);
  const sortedProducts = useMemo(() => [...draftProducts].sort((a, b) => a.name.localeCompare(b.name)), [draftProducts]);
  const selectedVisibleIds = visibleStock.map((item) => item.id);
  const allVisibleSelected = selectedVisibleIds.length > 0 && selectedVisibleIds.every((id) => selectedCardIds.includes(id));

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
    setSelectedCardIds([]);
    setSavedMessage("");
  }

  function toggleCardSelection(itemId: string) {
    setSelectedCardIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  }

  function toggleAllVisibleCards() {
    setSelectedCardIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !selectedVisibleIds.includes(id));
      return Array.from(new Set([...current, ...selectedVisibleIds]));
    });
  }

  function subtractSelectedCards() {
    if (!selectedCardIds.length) return;
    const ok = window.confirm(`Vas a borrar 1 unidad de ${selectedCardIds.length} fila(s) seleccionada(s). Después tenés que guardar cambios.`);
    if (!ok) return;

    setSavedMessage("");
    setDraftStock((current) => current.flatMap((item) => {
      if (!selectedCardIds.includes(item.id)) return [item];
      const nextQuantity = Math.max(item.reserved, item.quantity - 1);
      if (nextQuantity <= 0) return [];
      return [{ ...item, quantity: nextQuantity }];
    }));
    setSelectedCardIds([]);
  }

  async function saveCardChanges() {
    const savedRows = onSaveCards ? await onSaveCards(draftStock.map((item) => ({ ...item, sellerId }))) : null;
    setStock((current) => [
      ...current.filter((item) => item.sellerId !== sellerId),
      ...(savedRows ?? draftStock.map((item) => ({ ...item, sellerId }))),
    ]);
    setSelectedCardIds([]);
    setSavedMessage("Cartas guardadas.");
  }

  async function saveProductChanges() {
    const savedRows = onSaveProducts ? await onSaveProducts(draftProducts.map((item) => ({ ...item, sellerId }))) : null;
    setProducts((current) => [
      ...current.filter((item) => item.sellerId !== sellerId),
      ...(savedRows ?? draftProducts.map((item) => ({ ...item, sellerId }))),
    ]);
    setSavedMessage("Productos guardados.");
  }

  return (
    <div className="space-y-5">
      <section className="tool-surface publish-hero">
        <div>
          <p className="eyebrow">Gestionar</p>
          <h2 className="panel-title">Editar stock publicado</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Ajustá cantidades, precios, variantes o productos. Cada tabla se guarda por separado.</p>
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
            <span>{visibleStock.length} visibles · {selectedCardIds.length} seleccionadas</span>
          </div>
          <div className="table-actions">
            <label className="field compact-field">
              <span>Buscar cartas</span>
              <input value={cardQuery} onChange={(event) => setCardQuery(event.target.value)} placeholder="880 881 1275" />
            </label>
            <label className="field compact-field">
              <span>Expansión</span>
              <select value={expansionFilter} onChange={(event) => setExpansionFilter(event.target.value)}>
                <option value="">Todas</option>
                {SEARCH_FILTERS.expansions.filter((item) => item !== "todas").map((expansion) => <option key={expansion} value={expansion}>{expansion}</option>)}
              </select>
            </label>
            <label className="field compact-field">
              <span>Variante</span>
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
                <option value="">Todas</option>
                <option value="comun">{kindLabel.comun}</option>
                <option value="fluor">{kindLabel.fluor}</option>
                <option value="holo">{kindLabel.holo}</option>
              </select>
            </label>
            <button className="danger-button compact" onClick={subtractSelectedCards} disabled={!selectedCardIds.length}>
              <Trash2 size={16} />
              Borrar 1 carta por selección
            </button>
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
            <label className="table-check" title="Seleccionar todas las filas filtradas">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisibleCards} disabled={!visibleStock.length} />
            </label>
            <span>N° carta</span>
            <span>Variante</span>
            <span>Color variante</span>
            <span>Cantidad</span>
            <span>Precio</span>
            <span></span>
          </div>
          {visibleStockPage.map((item) => (
            <div key={item.id} className="manage-row card-manage-row">
              <label className="table-check">
                <input type="checkbox" checked={selectedCardIds.includes(item.id)} onChange={() => toggleCardSelection(item.id)} aria-label={`Seleccionar carta ${item.number}`} />
              </label>
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
          {!draftStock.length && <p className="empty">Todavía no hay cartas publicadas.</p>}
          {draftStock.length > 0 && !visibleStock.length && <p className="empty">No hay cartas con esos filtros.</p>}
        </div>
        <Pagination page={cardPage} pageSize={cardPageSize} total={visibleStock.length} onPageChange={setCardPage} />
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
            <span>Categoría</span>
            <span>Producto</span>
            <span>Cantidad</span>
            <span>Precio</span>
            <span>Descripción</span>
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
          {!draftProducts.length && <p className="empty">Todavía no hay productos publicados.</p>}
        </div>
      </section>
    </div>
  );
}

function getCardColorOptions(item: CardStock) {
  const options = getColorOptions(item.number, item.kind);
  return options.includes(item.variant) ? options : [item.variant, ...options];
}
