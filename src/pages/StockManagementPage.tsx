import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import type { CardKind, CardStock, Product } from "../lib/types";
import { formatMoney, kindLabel } from "../lib/helpers";

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

  useEffect(() => setDraftStock(stock), [stock]);
  useEffect(() => setDraftProducts(products), [products]);

  const isDirty = useMemo(
    () => JSON.stringify(draftStock) !== JSON.stringify(stock) || JSON.stringify(draftProducts) !== JSON.stringify(products),
    [draftProducts, draftStock, products, stock],
  );
  const stockValue = draftStock.reduce((sum, item) => sum + item.quantity * item.price, 0) + draftProducts.reduce((sum, item) => sum + item.quantity * item.price, 0);

  function updateCard(itemId: string, patch: Partial<Pick<CardStock, "quantity" | "price" | "kind" | "variant" | "expansion">>) {
    setSavedMessage("");
    setDraftStock((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item));
  }

  function updateProduct(productId: string, patch: Partial<Pick<Product, "quantity" | "price" | "name" | "category">>) {
    setSavedMessage("");
    setDraftProducts((current) => current.map((product) => product.id === productId ? { ...product, ...patch } : product));
  }

  function discardChanges() {
    setDraftStock(stock);
    setDraftProducts(products);
    setSavedMessage("");
  }

  function saveChanges() {
    setStock((current) => [
      ...current.filter((item) => item.sellerId !== sellerId),
      ...draftStock.map((item) => ({ ...item, sellerId })),
    ]);
    setProducts((current) => [
      ...current.filter((item) => item.sellerId !== sellerId),
      ...draftProducts.map((item) => ({ ...item, sellerId })),
    ]);
    setSavedMessage("Cambios guardados.");
  }

  return (
    <div className="space-y-5">
      <section className="tool-surface publish-hero">
        <div>
          <p className="eyebrow">Gestionar</p>
          <h2 className="panel-title">Editar stock publicado</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Ajustá cantidades, precios, variantes o productos. Los cambios se aplican cuando tocás Guardar.</p>
        </div>
        <div className="manage-actions">
          <button className="secondary-button" onClick={discardChanges} disabled={!isDirty}>
            <RotateCcw size={18} />
            Descartar
          </button>
          <button className="primary-button" onClick={saveChanges} disabled={!isDirty}>
            <Save size={18} />
            Guardar cambios
          </button>
        </div>
      </section>

      <section className="stock-summary-grid">
        <div className="metric">
          <div>
            <p>Cartas publicadas</p>
            <strong>{draftStock.length}</strong>
          </div>
        </div>
        <div className="metric">
          <div>
            <p>Productos publicados</p>
            <strong>{draftProducts.length}</strong>
          </div>
        </div>
        <div className="metric">
          <div>
            <p>Valor cargado</p>
            <strong>{formatMoney(stockValue)}</strong>
          </div>
        </div>
      </section>
      {savedMessage && <p className="save-feedback">{savedMessage}</p>}

      <section className="tool-surface">
        <div className="section-heading">
          <h3>Cartas</h3>
          <span>{draftStock.length} variantes</span>
        </div>
        <div className="stock-table">
          <div className="manage-row manage-row-header">
            <span>N°</span>
            <span>Tipo</span>
            <span>Variante</span>
            <span>Expansión</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span></span>
          </div>
          {draftStock.map((item) => (
            <div key={item.id} className="manage-row">
              <strong>{item.number}</strong>
              <select value={item.kind} onChange={(event) => updateCard(item.id, { kind: event.target.value as CardKind })} aria-label={`Tipo carta ${item.number}`}>
                <option value="comun">{kindLabel.comun}</option>
                <option value="fluor">{kindLabel.fluor}</option>
                <option value="holo">{kindLabel.holo}</option>
              </select>
              <input value={item.variant} onChange={(event) => updateCard(item.id, { variant: event.target.value })} />
              <input value={item.expansion} onChange={(event) => updateCard(item.id, { expansion: event.target.value })} />
              <input type="number" min={0} value={item.quantity} onChange={(event) => updateCard(item.id, { quantity: Math.max(0, Number(event.target.value)) })} />
              <input type="number" min={0} value={item.price} onChange={(event) => updateCard(item.id, { price: Math.max(0, Number(event.target.value)) })} />
              <button className="ghost-icon" onClick={() => setDraftStock((current) => current.filter((row) => row.id !== item.id))} aria-label="Eliminar carta">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!draftStock.length && <p className="empty">Todavía no hay cartas publicadas.</p>}
        </div>
      </section>

      <section className="tool-surface">
        <div className="section-heading">
          <h3>Productos</h3>
          <span>{draftProducts.length} publicaciones</span>
        </div>
        <div className="stock-table">
          <div className="manage-row product-manage-row manage-row-header">
            <span>Categoría</span>
            <span>Producto</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span></span>
          </div>
          {draftProducts.map((product) => (
            <div key={product.id} className="manage-row product-manage-row">
              <select value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value as Product["category"] })}>
                {productCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <input value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} />
              <input type="number" min={0} value={product.quantity} onChange={(event) => updateProduct(product.id, { quantity: Math.max(0, Number(event.target.value)) })} />
              <input type="number" min={0} value={product.price} onChange={(event) => updateProduct(product.id, { price: Math.max(0, Number(event.target.value)) })} />
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
