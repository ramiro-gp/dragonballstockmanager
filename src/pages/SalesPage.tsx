import { useState } from "react";
import clsx from "clsx";
import { Boxes, CircleDollarSign, Edit3, Plus, Save, WalletCards, X } from "lucide-react";
import type { CardStock, Product, Sale, SaleLine, SaleStatus } from "../lib/types";
import { availableQuantity, formatMoney, kindLabel, paidTotal, saleTotal, statusLabel } from "../lib/helpers";
import { Metric } from "../components/shared/Metric";

export function SalesPage({
  sales,
  stock,
  products,
  changeSaleStatus,
  saveSaleLines,
}: {
  sales: Sale[];
  stock: CardStock[];
  products: Product[];
  changeSaleStatus: (saleId: string, status: SaleStatus) => void;
  updateSaleLine: (saleId: string, lineIndex: number, quantity: number, price: number) => void;
  saveSaleLines: (saleId: string, lines: SaleLine[]) => void;
}) {
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [draftLines, setDraftLines] = useState<Record<string, SaleLine[]>>({});

  function startEdit(sale: Sale) {
    setEditingSaleId(sale.id);
    setDraftLines((current) => ({ ...current, [sale.id]: sale.lines.map((line) => ({ ...line })) }));
  }

  function updateDraftLine(saleId: string, lineIndex: number, patch: Partial<SaleLine>) {
    setDraftLines((current) => ({
      ...current,
      [saleId]: (current[saleId] ?? []).map((line, index) => index === lineIndex ? { ...line, ...patch } : line),
    }));
  }

  function addStockLine(saleId: string, itemId: string) {
    const item = stock.find((stockItem) => stockItem.id === itemId);
    if (!item) return;
    const line: SaleLine = {
      itemType: "card",
      itemId: item.id,
      sellerId: item.sellerId,
      label: `Carta ${item.number} · ${kindLabel[item.kind]} ${item.variant}`,
      unitPrice: item.price,
      finalUnitPrice: item.price,
      quantity: 1,
      maxQuantity: Math.max(1, availableQuantity(item)),
    };
    setDraftLines((current) => ({ ...current, [saleId]: [...(current[saleId] ?? []), line] }));
  }

  function addProductLine(saleId: string, itemId: string) {
    const product = products.find((item) => item.id === itemId);
    if (!product) return;
    const line: SaleLine = {
      itemType: "product",
      itemId: product.id,
      sellerId: product.sellerId,
      label: product.name,
      unitPrice: product.price,
      finalUnitPrice: product.price,
      quantity: 1,
      maxQuantity: Math.max(1, product.quantity),
    };
    setDraftLines((current) => ({ ...current, [saleId]: [...(current[saleId] ?? []), line] }));
  }

  function save(saleId: string) {
    saveSaleLines(saleId, draftLines[saleId] ?? []);
    setEditingSaleId(null);
  }

  return (
    <div className="grid gap-4">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historial</p>
          <h2 className="panel-title">Ventas y pedidos</h2>
        </div>
        <span>{sales.length} pedidos</span>
      </div>
      {sales.map((sale) => {
        const editing = editingSaleId === sale.id;
        const lines = editing ? draftLines[sale.id] ?? sale.lines : sale.lines;
        const total = lines.reduce((sum, line) => sum + line.finalUnitPrice * line.quantity, 0);
        const paid = paidTotal(sale);
        return (
          <article key={sale.id} className="tool-surface">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="eyebrow">{sale.orderNumber}</p>
                <h3 className="panel-title">{sale.customerName}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{sale.note || "Sin notas"}</p>
              </div>
              <div className="status-group">
                {(["pendiente", "reservada", "confirmada", "cancelada"] as SaleStatus[]).map((status) => (
                  <button key={status} className={clsx("status-button", sale.status === status && "active")} onClick={() => changeSaleStatus(sale.id, status)}>
                    {statusLabel[status]}
                  </button>
                ))}
                {editing ? (
                  <button className="primary-button compact" onClick={() => save(sale.id)}><Save size={16} />Guardar cambios</button>
                ) : (
                  <button className="secondary-button compact" onClick={() => startEdit(sale)}><Edit3 size={16} />Editar</button>
                )}
              </div>
            </div>
            <div className="mt-5 sale-edit-table">
              <div className="sale-edit-row header">
                <span>Item</span>
                <span>Cantidad</span>
                <span>Precio unitario</span>
                <span></span>
              </div>
              {lines.map((line, index) => (
                <div key={`${line.itemId}-${index}`} className="sale-edit-row">
                  <div>
                    <p>{line.label}</p>
                    <span>Original: {formatMoney(line.unitPrice)}</span>
                  </div>
                  <input type="number" min={1} value={line.quantity} disabled={!editing} onChange={(event) => updateDraftLine(sale.id, index, { quantity: Math.max(1, Number(event.target.value)) })} />
                  <input type="number" min={0} value={line.finalUnitPrice} disabled={!editing} onChange={(event) => updateDraftLine(sale.id, index, { finalUnitPrice: Math.max(0, Number(event.target.value)) })} />
                  {editing && (
                    <button className="ghost-icon" onClick={() => setDraftLines((current) => ({ ...current, [sale.id]: (current[sale.id] ?? []).filter((_, rowIndex) => rowIndex !== index) }))} aria-label="Quitar item">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {editing && (
              <div className="sale-add-grid mt-4">
                <label className="field">
                  <span>Agregar otra carta</span>
                  <select defaultValue="" onChange={(event) => { addStockLine(sale.id, event.target.value); event.currentTarget.value = ""; }}>
                    <option value="" disabled>Elegir carta</option>
                    {stock.map((item) => <option key={item.id} value={item.id}>Carta {item.number} · {kindLabel[item.kind]} {item.variant}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Agregar otro producto</span>
                  <select defaultValue="" onChange={(event) => { addProductLine(sale.id, event.target.value); event.currentTarget.value = ""; }}>
                    <option value="" disabled>Elegir producto</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
              </div>
            )}
            <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 md:grid-cols-3">
              <Metric icon={CircleDollarSign} label="Total venta" value={formatMoney(total)} />
              <Metric icon={WalletCards} label="Pago" value={formatMoney(paid)} />
              <Metric icon={Boxes} label="Saldo" value={formatMoney(Math.max(0, total - paid))} />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Stock aplicado: {sale.stockApplied ? "si" : "no"}. Al guardar una venta reservada o confirmada, el stock se recalcula.
            </p>
          </article>
        );
      })}
    </div>
  );
}
