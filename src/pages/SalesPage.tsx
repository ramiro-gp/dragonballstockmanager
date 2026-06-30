import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Archive, Boxes, CircleDollarSign, Plus, Save, Trash2, WalletCards, X } from "lucide-react";
import type { CardStock, DeliveryStatus, Product, Sale, SaleLine, SaleStatus } from "../lib/types";
import { availableProductQuantity, availableQuantity, formatMoney, kindLabel, paidTotal, saleItemsTotal, statusLabel } from "../lib/helpers";
import { variantDisplayLabel } from "../data/cromerosCatalog";
import { sortCardStock } from "../lib/sorting";
import { Metric } from "../components/shared/Metric";
import { SearchableSelect } from "../components/shared/SearchableSelect";

const pageSize = 8;
const deliveryLabels: Record<DeliveryStatus, string> = {
  delivery_pending: "Pendiente de envío",
  shipped: "Enviado",
  delivered: "Entregado",
};
const deliveryStatuses: DeliveryStatus[] = ["delivery_pending", "shipped", "delivered"];
type SaleDetailDraft = {
  customerName: string;
  customerWhatsapp: string;
  note: string;
  paymentAmount: number;
  totalOverride: string;
};

export function SalesPage({
  sales,
  stock,
  products,
  changeSaleStatus,
  changeSaleDeliveryStatus,
  saveSaleLines,
  saveSaleDetails,
  createManualSale,
  archiveSale,
  deleteSale,
}: {
  sales: Sale[];
  stock: CardStock[];
  products: Product[];
  changeSaleStatus: (saleId: string, status: SaleStatus) => Promise<void> | void;
  changeSaleDeliveryStatus: (saleId: string, status?: DeliveryStatus) => Promise<void> | void;
  updateSaleLine: (saleId: string, lineIndex: number, quantity: number, price: number) => void;
  saveSaleLines: (saleId: string, lines: SaleLine[]) => Promise<void> | void;
  saveSaleDetails: (saleId: string, patch: Pick<Sale, "customerName" | "customerWhatsapp" | "note" | "payments"> & { totalOverride?: number; lines?: SaleLine[] }) => Promise<boolean> | boolean;
  createManualSale: (input: { customerName: string; customerWhatsapp?: string; note?: string; date: string; lines: SaleLine[] }) => Promise<boolean> | boolean;
  archiveSale: (saleId: string) => Promise<void> | void;
  deleteSale: (saleId: string) => Promise<void> | void;
}) {
  const [draftLines, setDraftLines] = useState<Record<string, SaleLine[]>>({});
  const [draftDetails, setDraftDetails] = useState<Record<string, SaleDetailDraft>>({});
  const [view, setView] = useState<"active" | "archived">("active");
  const [page, setPage] = useState(1);
  const [savingSaleIds, setSavingSaleIds] = useState<string[]>([]);
  const [savingManualSale, setSavingManualSale] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualWhatsapp, setManualWhatsapp] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualLines, setManualLines] = useState<SaleLine[]>([]);

  const sortedStock = useMemo(() => [...stock].filter((item) => availableQuantity(item) > 0).sort(sortCardStock), [stock]);
  const sortedProducts = useMemo(() => [...products].filter((item) => availableProductQuantity(item) > 0).sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const cardOptions = useMemo(() => sortedStock.map((item) => ({
    value: item.id,
    label: cardOptionLabel(item),
    hint: `${formatMoney(item.price)} · ${availableQuantity(item)} disponibles`,
  })), [sortedStock]);
  const productOptions = useMemo(() => sortedProducts.map((product) => ({
    value: product.id,
    label: product.name,
    hint: `${formatMoney(product.price)} · ${availableProductQuantity(product)} disponibles`,
  })), [sortedProducts]);
  const visibleSales = sales.filter((sale) => view === "archived" ? Boolean(sale.archivedAt) : !sale.archivedAt);
  const pageCount = Math.max(1, Math.ceil(visibleSales.length / pageSize));
  const pagedSales = visibleSales.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setDraftLines((current) => {
      const next = { ...current };
      sales.forEach((sale) => {
        if (!next[sale.id]) next[sale.id] = sale.lines.map((line) => ({ ...line }));
      });
      Object.keys(next).forEach((saleId) => {
        if (!sales.some((sale) => sale.id === saleId)) delete next[saleId];
      });
      return next;
    });
    setDraftDetails((current) => {
      const next = { ...current };
      sales.forEach((sale) => {
        if (!next[sale.id]) {
          next[sale.id] = {
            customerName: sale.customerName,
            customerWhatsapp: sale.customerWhatsapp ?? "",
            note: sale.note ?? "",
            paymentAmount: paidTotal(sale),
            totalOverride: sale.totalOverride === undefined ? "" : String(sale.totalOverride),
          };
        }
      });
      Object.keys(next).forEach((saleId) => {
        if (!sales.some((sale) => sale.id === saleId)) delete next[saleId];
      });
      return next;
    });
  }, [sales]);

  useEffect(() => setPage(1), [view, sales.length]);

  function cardToLine(item: CardStock): SaleLine {
    const maxQuantity = Math.max(1, availableQuantity(item));
    return {
      itemType: "card",
      itemId: item.id,
      sellerId: item.sellerId,
      label: cardOptionLabel(item),
      unitPrice: item.price,
      finalUnitPrice: item.price,
      quantity: 1,
      maxQuantity,
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
      maxQuantity: Math.max(1, availableProductQuantity(product)),
    };
  }

  function updateDraftLine(saleId: string, lineIndex: number, patch: Partial<SaleLine>) {
    setFeedback("");
    setDraftLines((current) => ({
      ...current,
      [saleId]: (current[saleId] ?? []).map((line, index) => {
        if (index !== lineIndex) return line;
        const quantity = patch.quantity === undefined ? line.quantity : Math.min(line.maxQuantity, Math.max(1, patch.quantity));
        return { ...line, ...patch, quantity };
      }),
    }));
  }

  async function addStockLine(sale: Sale, itemId: string) {
    const item = stock.find((stockItem) => stockItem.id === itemId);
    if (!item) return;
    const nextLines = [...(draftLines[sale.id] ?? sale.lines), cardToLine(item)];
    setDraftLines((current) => ({ ...current, [sale.id]: nextLines }));
    await save(sale.id, nextLines);
  }

  async function addProductLine(sale: Sale, itemId: string) {
    const product = products.find((item) => item.id === itemId);
    if (!product) return;
    const nextLines = [...(draftLines[sale.id] ?? sale.lines), productToLine(product)];
    setDraftLines((current) => ({ ...current, [sale.id]: nextLines }));
    await save(sale.id, nextLines);
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
    setManualLines((current) => current.map((line, rowIndex) => {
      if (rowIndex !== index) return line;
      const quantity = patch.quantity === undefined ? line.quantity : Math.min(line.maxQuantity, Math.max(1, patch.quantity));
      return { ...line, ...patch, quantity };
    }));
  }

  function updateDraftDetails(saleId: string, patch: Partial<SaleDetailDraft>) {
    setFeedback("");
    setDraftDetails((current) => ({
      ...current,
      [saleId]: { ...current[saleId], ...patch } as SaleDetailDraft,
    }));
  }

  async function submitManualSale() {
    if (!manualLines.length) return;
    setSavingManualSale(true);
    const saved = await createManualSale({
      customerName: manualName,
      customerWhatsapp: manualWhatsapp,
      note: manualNote,
      date: manualDate,
      lines: manualLines,
    });
    setSavingManualSale(false);
    if (!saved) {
      setFeedback("No pude cargar la venta manual. Revisá stock disponible o conexión.");
      return;
    }
    setManualName("");
    setManualWhatsapp("");
    setManualNote("");
    setManualLines([]);
    setFeedback("Venta manual cargada.");
  }

  async function save(saleId: string, lines = draftLines[saleId] ?? []) {
    setFeedback("");
    setSavingSaleIds((current) => Array.from(new Set([...current, saleId])));
    await saveSaleLines(saleId, lines);
    const sale = sales.find((item) => item.id === saleId);
    const details = draftDetails[saleId];
    if (sale && details) {
      const paymentAmount = Math.max(0, Number(details.paymentAmount) || 0);
      const payment = sale.payments[0];
      const totalOverride = details.totalOverride === "" ? undefined : Math.max(0, Number(details.totalOverride) || 0);
      await saveSaleDetails(saleId, {
        customerName: details.customerName,
        customerWhatsapp: details.customerWhatsapp,
        note: details.note,
        totalOverride,
        lines,
        payments: paymentAmount > 0
          ? [{
            id: payment?.id ?? crypto.randomUUID(),
            amount: paymentAmount,
            note: sale.status === "reservada" ? "Seña / reserva" : "Pago registrado",
            date: payment?.date ?? new Date().toISOString().slice(0, 10),
          }]
          : [],
      });
    }
    setSavingSaleIds((current) => current.filter((id) => id !== saleId));
    setFeedback("Cambios guardados.");
  }

  async function setStatus(sale: Sale, status: SaleStatus) {
    if (sale.status === status) return;
    if (status === "cancelada") {
      const ok = window.confirm("Vas a cancelar este pedido. Si tenía stock aplicado, se libera.");
      if (!ok) return;
    }
    setFeedback("");
    setSavingSaleIds((current) => Array.from(new Set([...current, sale.id])));
    await changeSaleStatus(sale.id, status);
    setSavingSaleIds((current) => current.filter((id) => id !== sale.id));
    setFeedback("Estado actualizado.");
  }

  async function setDeliveryStatus(sale: Sale, status?: DeliveryStatus) {
    if (sale.status === "cancelada" || sale.deliveryStatus === status) return;
    setFeedback("");
    setSavingSaleIds((current) => Array.from(new Set([...current, sale.id])));
    await changeSaleDeliveryStatus(sale.id, status);
    setSavingSaleIds((current) => current.filter((id) => id !== sale.id));
    setFeedback("Entrega actualizada.");
  }

  return (
    <div className="grid gap-4">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historial</p>
          <h2 className="panel-title">Ventas y pedidos</h2>
        </div>
        <div className="view-toggle sales-view-toggle">
          <button className={clsx(view === "active" && "active")} onClick={() => setView("active")}>Activos</button>
          <button className={clsx(view === "archived" && "active")} onClick={() => setView("archived")}>Archivados</button>
        </div>
      </div>
      {feedback && <p className="save-feedback">{feedback}</p>}

      <section className="tool-surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Venta manual</p>
            <h3>Cargar venta fuera del sistema</h3>
          </div>
          <button className="primary-button compact" disabled={!manualLines.length || savingManualSale} onClick={submitManualSale}>
            <Plus size={16} />
            {savingManualSale ? "Guardando..." : "Agregar venta"}
          </button>
        </div>
        <div className="manual-sale-grid mt-4">
          <label className="field"><span>Cliente</span><input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nombre opcional" /></label>
          <label className="field"><span>WhatsApp</span><input value={manualWhatsapp} onChange={(event) => setManualWhatsapp(event.target.value)} placeholder="Opcional" /></label>
          <label className="field"><span>Fecha</span><input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} /></label>
          <p className="field-hint manual-stock-check">La venta manual se guarda como confirmada y descuenta el stock seleccionado.</p>
          <label className="field">
            <span>Agregar carta</span>
            <SearchableSelect options={cardOptions} placeholder="Buscar por número, variante o color" onSelect={addManualCard} />
          </label>
          <label className="field">
            <span>Agregar producto</span>
            <SearchableSelect options={productOptions} placeholder="Buscar producto" onSelect={addManualProduct} />
          </label>
          <label className="field manual-note"><span>Nota</span><input value={manualNote} onChange={(event) => setManualNote(event.target.value)} placeholder="Ej: venta en plaza, precio arreglado por WhatsApp..." /></label>
        </div>
        {manualLines.length > 0 && (
          <div className="mt-4 sale-edit-table">
            {manualLines.map((line, index) => (
              <div key={`${line.itemId}-${index}`} className="sale-edit-row">
                <div><p>{line.label}</p><span>Original: {formatMoney(line.unitPrice)}</span></div>
                <input type="number" min={1} max={line.maxQuantity} value={line.quantity} onChange={(event) => updateManualLine(index, { quantity: Math.max(1, Number(event.target.value)) })} />
                <input type="number" min={0} value={line.finalUnitPrice} onChange={(event) => updateManualLine(index, { finalUnitPrice: Math.max(0, Number(event.target.value)) })} />
                <button className="ghost-icon" onClick={() => setManualLines((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Quitar item"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="section-heading">
        <span>{visibleSales.length} pedidos</span>
        {pageCount > 1 && <span>Página {page} de {pageCount}</span>}
      </div>
      {pagedSales.map((sale) => {
        const lines = draftLines[sale.id] ?? sale.lines;
        const details = draftDetails[sale.id] ?? {
          customerName: sale.customerName,
          customerWhatsapp: sale.customerWhatsapp ?? "",
          note: sale.note ?? "",
          paymentAmount: paidTotal(sale),
          totalOverride: sale.totalOverride === undefined ? "" : String(sale.totalOverride),
        };
        const itemsTotal = saleItemsTotal({ lines });
        const total = details.totalOverride === "" ? itemsTotal : Math.max(0, Number(details.totalOverride) || 0);
        const paid = Math.max(0, Number(details.paymentAmount) || 0);
        const isSavingSale = savingSaleIds.includes(sale.id);
        return (
          <article key={sale.id} className="tool-surface">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="eyebrow">{sale.orderNumber}{sale.manual ? " · Manual" : ""}{sale.archivedAt ? ` · Archivado ${sale.archivedAt}` : ""}</p>
                <h3 className="panel-title">{details.customerName || "Cliente sin nombre"}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{details.note || "Sin notas"}</p>
              </div>
              <div className="status-group">
                {(["pendiente", "reservada", "confirmada", "cancelada"] as SaleStatus[]).map((status) => (
                  <button key={status} className={clsx("status-button", sale.status === status && "active")} onClick={() => void setStatus(sale, status)} disabled={isSavingSale}>
                    {statusLabel[status]}
                  </button>
                ))}
                {!sale.archivedAt && <button className="secondary-button compact" onClick={() => archiveSale(sale.id)} disabled={isSavingSale}><Archive size={16} />Archivar</button>}
                {(sale.archivedAt || sale.status === "cancelada") && <button className="danger-button compact" onClick={() => deleteSale(sale.id)} disabled={isSavingSale}><Trash2 size={16} />Borrar</button>}
                <button className="primary-button compact" onClick={() => void save(sale.id)} disabled={isSavingSale}><Save size={16} />{isSavingSale ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>

            <div className="sale-detail-grid mt-4">
              <label className="field"><span>Cliente</span><input value={details.customerName} onChange={(event) => updateDraftDetails(sale.id, { customerName: event.target.value })} /></label>
              <label className="field"><span>WhatsApp</span><input value={details.customerWhatsapp} onChange={(event) => updateDraftDetails(sale.id, { customerWhatsapp: event.target.value })} /></label>
              <label className="field sale-detail-note"><span>Notas</span><input value={details.note} onChange={(event) => updateDraftDetails(sale.id, { note: event.target.value })} /></label>
              <label className="field"><span>{sale.status === "reservada" ? "Monto reservado" : "Pago registrado"}</span><input type="number" min={0} value={details.paymentAmount} onChange={(event) => updateDraftDetails(sale.id, { paymentAmount: Math.max(0, Number(event.target.value)) })} /></label>
              <label className="field"><span>Total final manual</span><input type="number" min={0} placeholder={String(itemsTotal)} value={details.totalOverride} onChange={(event) => updateDraftDetails(sale.id, { totalOverride: event.target.value })} /></label>
              <p className="field-hint sale-detail-hint">Dejá el total vacío para usar el total por ítems: {formatMoney(itemsTotal)}.</p>
            </div>

            <div className="sale-add-grid mt-4">
              <label className="field">
                <span>Agregar otra carta</span>
                <SearchableSelect options={cardOptions} placeholder="Buscar por número, variante o color" disabled={isSavingSale} onSelect={(value) => void addStockLine(sale, value)} />
              </label>
              <label className="field">
                <span>Agregar otro producto</span>
                <SearchableSelect options={productOptions} placeholder="Buscar producto" disabled={isSavingSale} onSelect={(value) => void addProductLine(sale, value)} />
              </label>
            </div>

            <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4">
              <p className="eyebrow">Entrega</p>
              {sale.status === "cancelada" ? (
                <p className="text-sm text-[var(--muted)]">Venta cancelada, sin seguimiento de entrega activo.</p>
              ) : (
                <div className="view-toggle delivery-view-toggle">
                  <button className={clsx(!sale.deliveryStatus && "active")} onClick={() => void setDeliveryStatus(sale, undefined)} disabled={isSavingSale}>Sin estado</button>
                  {deliveryStatuses.map((status) => (
                    <button key={status} className={clsx(sale.deliveryStatus === status && "active")} onClick={() => void setDeliveryStatus(sale, status)} disabled={isSavingSale}>
                      {deliveryLabels[status]}
                    </button>
                  ))}
                </div>
              )}
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
                  <input type="number" min={1} max={line.maxQuantity} value={line.quantity} onChange={(event) => updateDraftLine(sale.id, index, { quantity: Math.min(line.maxQuantity, Math.max(1, Number(event.target.value))) })} />
                  <input type="number" min={0} value={line.finalUnitPrice} onChange={(event) => updateDraftLine(sale.id, index, { finalUnitPrice: Math.max(0, Number(event.target.value)) })} />
                  <button className="ghost-icon" onClick={() => setDraftLines((current) => ({ ...current, [sale.id]: (current[sale.id] ?? []).filter((_, rowIndex) => rowIndex !== index) }))} aria-label="Quitar item" disabled={isSavingSale}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 md:grid-cols-3">
              <Metric icon={CircleDollarSign} label="Total venta" value={formatMoney(total)} />
              <Metric icon={WalletCards} label="Pago" value={formatMoney(paid)} />
              <Metric icon={Boxes} label="Saldo pendiente" value={formatMoney(Math.max(0, total - paid))} />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Stock aplicado: {sale.stockApplied ? "sí" : "no"}. Al guardar una venta reservada o confirmada, el stock se recalcula.
            </p>
          </article>
        );
      })}
      {visibleSales.length === 0 && <p className="empty">No hay pedidos en esta vista.</p>}
      {pageCount > 1 && (
        <div className="pagination">
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Anterior</button>
          <span>{page} / {pageCount}</span>
          <button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

function cardOptionLabel(item: CardStock) {
  return `N° ${item.number} - ${kindLabel[item.kind]} ${variantDisplayLabel(item.variant)}`;
}
