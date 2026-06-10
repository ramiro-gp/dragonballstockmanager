import { BarChart3, Check, ClipboardList, PackageCheck } from "lucide-react";

export function SubscriptionExpiredPage({ sellerWhatsapp }: { sellerWhatsapp: string }) {
  const text = encodeURIComponent("Hola Rama, te envio comprobante de pago. Renove la suscripcion.");
  const plans = [
    { label: "1 mes", price: "$3000" },
    { label: "3 meses", price: "$7500" },
    { label: "6 meses", price: "$13000" },
    { label: "Pago unico", price: "$25000" },
  ];
  return (
    <section className="subscription-wall">
      <p className="eyebrow">Suscripcion vencida</p>
      <h1>Renova tu suscripcion para seguir usando la app</h1>
      <div className="renew-benefits">
        <span><PackageCheck size={18} /> Control de stock</span>
        <span><ClipboardList size={18} /> Seguimiento de pedidos</span>
        <span><BarChart3 size={18} /> Graficos de ventas</span>
        <span><Check size={18} /> Publicacion activa</span>
      </div>
      <div className="plan-grid">
        {plans.map((plan) => <button className="secondary-button" key={plan.label}>{plan.label} - {plan.price}</button>)}
      </div>
      <a className="primary-button" href={`https://wa.me/${sellerWhatsapp.replace(/\D/g, "")}?text=${text}`} target="_blank" rel="noreferrer">
        Enviar comprobante por WhatsApp
      </a>
    </section>
  );
}
