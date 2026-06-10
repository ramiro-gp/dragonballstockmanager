import clsx from "clsx";
import { Boxes, CircleDollarSign, WalletCards } from "lucide-react";
import type { Sale, SaleStatus } from "../lib/types";
import { formatMoney, paidTotal, saleTotal, statusLabel } from "../lib/helpers";
import { Metric } from "../components/shared/Metric";

export function SalesPage({
  sales,
  changeSaleStatus,
  updateSaleLine,
}: {
  sales: Sale[];
  changeSaleStatus: (saleId: string, status: SaleStatus) => void;
  updateSaleLine: (saleId: string, lineIndex: number, quantity: number, price: number) => void;
}) {
  return (
    <div className="grid gap-4">
      {sales.map((sale) => {
        const total = saleTotal(sale);
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
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {sale.lines.map((line, index) => (
                <div key={`${line.itemId}-${index}`} className="sale-line">
                  <div>
                    <p>{line.label}</p>
                    <span>Original: {formatMoney(line.unitPrice)}</span>
                  </div>
                  <input type="number" value={line.quantity} disabled={sale.stockApplied} onChange={(event) => updateSaleLine(sale.id, index, Number(event.target.value), line.finalUnitPrice)} />
                  <input type="number" value={line.finalUnitPrice} disabled={sale.stockApplied} onChange={(event) => updateSaleLine(sale.id, index, line.quantity, Number(event.target.value))} />
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 md:grid-cols-3">
              <Metric icon={CircleDollarSign} label="Total venta" value={formatMoney(total)} />
              <Metric icon={WalletCards} label="Pagó" value={formatMoney(paid)} />
              <Metric icon={Boxes} label="Saldo" value={formatMoney(Math.max(0, total - paid))} />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Stock aplicado: {sale.stockApplied ? "sí" : "no"}. Reservada y confirmada no descuentan dos veces.
            </p>
          </article>
        );
      })}
    </div>
  );
}
