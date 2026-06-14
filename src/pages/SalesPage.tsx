import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Archive, Boxes, CircleDollarSign, Plus, Save, Trash2, WalletCards, X } from "lucide-react";
import type { CardStock, Product, Sale, SaleLine, SaleStatus } from "../lib/types";
import { availableQuantity, formatMoney, kindLabel, paidTotal, statusLabel } from "../lib/helpers";
import { sortCardStock } from "../lib/sorting";
import { Metric } from "../components/shared/Metric";

export function SalesPage({
  sales,
  stock,
  products,
  changeSaleStatus,
  saveSaleLines,
  createManualSale,
  archiveSale,
  deleteSale,
}: {
  sales: Sale[];
  stock: CardStock[];
  products: Product[];
  changeSaleStatus: (saleId: string, status: SaleStatus) => void;
  updateSaleLine: (saleId: string, lineIndex: number, quantity: number, price: number) => void;
  saveSaleLines: (saleId: string, lines: SaleLine[]) => void;
  createManualSale: (input: { customerName: string; customerWhatsapp?: string; note?: string; date: string; lines: SaleLine[]; applyStock: boolean }) => void;
  archiveSale: (saleId: string) => void;
  deleteSale: (saleId: string) => void;
}) {
  const [draftLines, setDraftLines] = useState<Record<string, SaleLine[]>>({});
  const [view, setView] = useState<"active" | "archived">("active");
  const [manualName, setManualName] = useState("");
  const [manualWhatsapp, setManualWhatsapp] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualApplyStock, setManualApplyStock] = useState(true);
  const [manualLines, setManualLines] = useState<SaleLine[]>([]);
  const sortedStock = useMemo(() => [...stock].sort(sortCardStock), [stock]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const visibleSales = sales.filter((sale) => view === "archived" ? Boolean(sale.archivedAt) : !sale.archivedAt);

  useEffect(() => {
    setDraftLines((current) => {
      const next = { ...current };
      sales.forEach((sale) => {
        if (!next[sale.id]) next[sale.id] = sale.lines.map((line) => ({ ...line }));
      });
      return next;
    });
  }, [sales]);

  function updateDraftLine(saleId: string, lineIndex: number, patch: Partial<SaleLine>) {
    setDraftLines((current) => ({
      ...current,
      [saleId]: (current[saleId] ?? []).map((line, index) => index === lineIndex ? { ...line, ...patch } : line),
    }));
  }

  function cardToLine(item: CardStock): SaleLine {
    return {
      itemType: "card",
      itemId: item.id,
      sellerId: item.sellerId,
      label: `Carta ${item.number} - ${kindLabel[item.kind]} ${item.variant}`,
      unitPrice: item.price,
      finalUnitPrice: item.price,
      quantity: 1,
      maxQuantity: Math.max(1, availableQuantity(item)),
    };
  }

  function productToLine(product: Product): SaleLine {
    return {
      itemType: "product",
      itemId: product.id,
      sellerId: product.sellerId,
      label: product.name,
      unitPrice: product.price,
      finalUnitPrice: product.price,
      quantity: 1,
      maxQuantity: Math.max(1, product.quantity),
    };
  }

  function addStockLine(sale: Sale, itemId: string) {
    const item = stock.find((stockItem) => stockItem.id === itemId);
    if (!item) return;
    const nextLines = [...(draftLines[sale.id] ?? sale.lines), cardToLine(item)];
    setDraftLines((current) => ({ ...current, [sale.id]: nextLines }));
    saveSaleLines(sale.id, nextLines);
  }

  function addProductLine(sale: Sale, itemId: string) {
    const product = products.find((item) => item.id === itemId);
    if (!product) return;
    const nextLines = [...(draftLines[sale.id] ?? sale.lines), productToLine(product)];
    setDraftLines((current) => ({ ...current, [sale.id]: nextLines }));
    saveSaleLines(sale.id, nextLines);
  }

  function addManualCard(itemId: string) {
    const item = stock.find((stockItem) => stockItem.id === itemId);
    if (item) setManualLines((current) => [...current, cardToLine(item)]);
  }

  function addManualProduct(itemId: string) {
    const product = products.find((item) => item.id === itemId);
    if (product) setManualLines((current) => [...current, productToLine(product)]);
  }

  function updateManualLine(index: number, patch: Partial<SaleLine>) {
    setManualLines((current) => current.map((line, rowIndex) => rowIndex === index ? { ...line, ...patch } : line));
  }

  function submitManualSale() {
    if (!manualLines.length) return;
    createManualSale({
      customerName: manualName,
      customerWhatsapp: manualWhatsapp,
      note: manualNote,
      date: manualDate,
      lines: manualLines,
      applyStock: manualApplyStock,
    });
    setManualName("");
    setManualWhatsapp("");
    setManualNote("");
    setManualLines([]);
  }

  function save(saleId: string) {
    saveSaleLines(saleId, draftLines[saleId] ?? []);
  }

  return (
    <div className="grid gap-4">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historial</p>
          <h2 className="panel-title">Ventas y pedidos</h2>
        </div>
        <div className="view-toggle">
          <button className={clsx(view === "active" && "active")} onClick={() => setView("active")}>Activos</button>
          <button className={clsx(view === "archived" && "active")} onClick={() => setView("archived")}>Archivados</button>
        </div>
      </div>

      <section className="tool-surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Venta manual</p>
            <h3>Cargar venta fuera del sistema</h3>
          </div>
          <button className="primary-button compact" disabled={!manualLines.length} onClick={submitManualSale}>
            <Plus size={16} />
            Agregar venta
          </button>
        </div>
        <div className="manual-sale-grid mt-4">
          <label className="field"><span>Cliente</span><input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nombre opcional" /></label>
          <label className="field"><span>WhatsApp</span><input value={manualWhatsapp} onChange={(event) => setManualWhatsapp(event.target.value)} placeholder="Opcional" /></label>
          <label className="field"><span>Fecha</span><input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} /></label>
          <label className="check-row manual-stock-check">
            <input type="checkbox" checked={manualApplyStock} onChange={(event) => setManualApplyStock(event.target.checked)} />
            Descontar stock
          </label>
          <label className="field"><span>Agregar carta</span><select defaultValue="" onChange={(event) => { addManualCard(event.target.value); event.currentTarget.value = ""; }}><option value="" disabled>Elegir carta</option>{sortedStock.map((item) => <option key={item.id} value={item.id}>Carta {item.number} - {kindLabel[item.kind]} {item.variant}</option>)}</select></label>
          <label className="field"><span>Agregar producto</span><select defaultValue="" onChange={(event) => { addManualProduct(event.target.value); event.currentTarget.value = ""; }}><option value="" disabled>Elegir producto</option>{sortedProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="field manual-note"><span>Nota</span><input value={manualNote} onChange={(event) => setManualNote(event.target.value)} placeholder="Ej: venta en plaza, precio arreglado por WhatsApp..." /></label>
        </div>
        {manualLines.length > 0 && (
          <div className="mt-4 sale-edit-table">
            {manualLines.map((line, index) => (
              <div key={`${line.itemId}-${index}`} className="sale-edit-row">
                <div><p>{line.label}</p><span>Original: {formatMoney(line.unitPrice)}</span></div>
                <input type="number" min={1} value={line.quantity} onChange={(event) => updateManualLine(index, { quantity: Math.max(1, Number(event.target.value)) })} />
                <input type="number" min={0} value={line.finalUnitPrice} onChange={(event) => updateManualLine(index, { finalUnitPrice: Math.max(0, Number(event.target.value)) })} />
                <button className="ghost-icon" onClick={() => setManualLines((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Quitar item"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <span>{visibleSales.length} pedidos</span>
      {visibleSales.map((sale) => {
        const lines = draftLines[sale.id] ?? sale.lines;
        const total = lines.reduce((sum, line) => sum + line.finalUnitPrice * line.quantity, 0);
        const paid = paidTotal(sale);
        return (
          <article key={sale.id} className="tool-surface">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="eyebrow">{sale.orderNumber}{sale.manual ? " · Manual" : ""}{sale.archivedAt ? ` · Archivado ${sale.archivedAt}` : ""}</p>
                <h3 className="panel-title">{sale.customerName}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{sale.note || "Sin notas"}</p>
              </div>
              <div className="status-group">
                {(["pendiente", "reservada", "confirmada", "cancelada"] as SaleStatus[]).map((status) => (
                  <button key={status} className={clsx("status-button", sale.status === status && "active")} onClick={() => changeSaleStatus(sale.id, status)}>
                    {statusLabel[status]}
                  </button>
                ))}
                {!sale.archivedAt && <button className="secondary-button compact" onClick={() => archiveSale(sale.id)}><Archive size={16} />Archivar</button>}
                {(sale.archivedAt || sale.status === "cancelada") && <button className="danger-button compact" onClick={() => deleteSale(sale.id)}><Trash2 size={16} />Borrar</button>}
                <button className="primary-button compact" onClick={() => save(sale.id)}><Save size={16} />Guardar cambios</button>
              </div>
            </div>

            <div className="sale-add-grid mt-4">
              <label className="field">
                <span>Agregar otra carta</span>
                <select defaultValue="" onChange={(event) => { addStockLine(sale, event.target.value); event.currentTarget.value = ""; }}>
                  <option value="" disabled>Elegir carta</option>
                  {sortedStock.map((item) => <option key={item.id} value={item.id}>Carta {item.number} - {kindLabel[item.kind]} {item.variant}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Agregar otro producto</span>
                <select defaultValue="" onChange={(event) => { addProductLine(sale, event.target.value); event.currentTarget.value = ""; }}>
                  <option value="" disabled>Elegir producto</option>
                  {sortedProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </label>
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
                  <input type="number" min={1} value={line.quantity} onChange={(event) => updateDraftLine(sale.id, index, { quantity: Math.max(1, Number(event.target.value)) })} />
                  <input type="number" min={0} value={line.finalUnitPrice} onChange={(event) => updateDraftLine(sale.id, index, { finalUnitPrice: Math.max(0, Number(event.target.value)) })} />
                  <button className="ghost-icon" onClick={() => setDraftLines((current) => ({ ...current, [sale.id]: (current[sale.id] ?? []).filter((_, rowIndex) => rowIndex !== index) }))} aria-label="Quitar item">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
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
