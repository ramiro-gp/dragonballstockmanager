import { useMemo, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import type { CartLine } from "../lib/types";
import { buildWhatsappUrl, cartTotal, formatMoney } from "../lib/helpers";
import { isValidArgentinaWhatsapp, normalizeArgentinaWhatsapp, whatsappHint } from "../lib/whatsapp";

export function CartPage({
  cart,
  setCart,
  sellerName,
  sellerWhatsapp,
  createPendingSale,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  sellerName: string;
  sellerWhatsapp: string;
  createPendingSale: (customerName: string, customerWhatsapp: string, note: string, orderNumber: string) => Promise<boolean> | boolean;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [saleError, setSaleError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const orderNumber = useMemo(() => `DBSM-${Math.floor(2400 + Math.random() * 7000)}`, [cart.length]);
  const normalizedCustomerWhatsapp = normalizeArgentinaWhatsapp(customerWhatsapp);
  const whatsappValid = !customerWhatsapp.trim() || isValidArgentinaWhatsapp(customerWhatsapp);
  const whatsappUrl = buildWhatsappUrl(sellerWhatsapp, sellerName, orderNumber, cart, note);

  async function consultByWhatsapp() {
    if (!cart.length || !whatsappValid || submitting) return;
    setSaleError("");
    setSubmitting(true);
    const saved = await createPendingSale(customerName, normalizedCustomerWhatsapp, note, orderNumber);
    setSubmitting(false);
    if (saved === false) {
      setSaleError("No pude guardar el pedido para seguimiento. Probá de nuevo antes de enviarlo por WhatsApp.");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="tool-surface">
        <div className="section-heading">
          <h2>Carrito</h2>
          <span>{cart.length} ítems</span>
        </div>
        <div className="mt-4 space-y-3">
          {cart.map((line) => (
            <div key={line.itemId} className="cart-line cart-line-page">
              <div>
                <p>{line.label}</p>
                <span>{formatMoney(line.unitPrice)} x {line.quantity} · disponible {line.maxQuantity}</span>
              </div>
              <div className="cart-line-actions">
                <button className="ghost-icon" onClick={() => setCart((current) => current.map((item) => item.itemId === line.itemId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))} aria-label="Restar">-</button>
                <button className="ghost-icon" disabled={line.quantity >= line.maxQuantity} onClick={() => setCart((current) => current.map((item) => item.itemId === line.itemId ? { ...item, quantity: Math.min(item.maxQuantity, item.quantity + 1) } : item))} aria-label="Sumar">+</button>
                <button className="ghost-icon" onClick={() => setCart((current) => current.filter((item) => item.itemId !== line.itemId))} aria-label="Quitar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {!cart.length && <p className="empty">Todavía no hay productos seleccionados.</p>}
        </div>
      </section>
      <aside className="tool-surface h-fit">
        <h3 className="panel-title">Consulta</h3>
        <div className="mt-4 grid gap-3">
          <input className="input" placeholder="Tu nombre" value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={60} />
          <input className="input" placeholder="Tu WhatsApp" value={customerWhatsapp} onChange={(event) => setCustomerWhatsapp(event.target.value)} maxLength={24} />
          {customerWhatsapp && <p className={whatsappValid ? "field-hint" : "field-hint error"}>{whatsappHint(customerWhatsapp)}</p>}
          <textarea className="input" placeholder="Nota opcional" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} />
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span>{formatMoney(cartTotal(cart))}</span>
          </div>
        </div>
        {saleError && <p className="form-error mt-3">{saleError}</p>}
        <button className="primary-button mt-4 w-full" onClick={consultByWhatsapp} disabled={!cart.length || !whatsappValid || submitting}>
          <ChevronRight size={18} />
          {submitting ? "Guardando pedido..." : "Consultar stock por WhatsApp"}
        </button>
      </aside>
    </div>
  );
}
