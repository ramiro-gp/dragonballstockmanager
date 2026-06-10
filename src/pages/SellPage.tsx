import { BarChart3, CheckCircle2, ClipboardCheck, Link, MessageCircle, PackageCheck, SearchCheck, WalletCards } from "lucide-react";

const sellerContactWhatsapp = import.meta.env.VITE_SELLER_CONTACT_WHATSAPP || "5491100000000";

export function SellPage() {
  const benefits = [
    { icon: Link, title: "Link propio", text: "Compartis tu stock con un link simple y cada cliente consulta lo que le falta sin pedirte capturas." },
    { icon: SearchCheck, title: "Busqueda por lista", text: "El cliente pega sus faltantes y ve rapido que tenes disponible, con variantes y precios." },
    { icon: PackageCheck, title: "Stock automatico", text: "Publicas cartas o productos y cada venta confirmada se descuenta automaticamente del stock." },
    { icon: ClipboardCheck, title: "Pedidos en seguimiento", text: "Cada consulta queda como pedido pendiente para reservar, confirmar o cancelar cuando arreglas por WhatsApp." },
    { icon: WalletCards, title: "Balance claro", text: "Controlas ingresos, gastos, senas y saldos sin tener todo mezclado en papel o chats." },
    { icon: BarChart3, title: "Graficos de venta", text: "Ves como viene tu movimiento, detectas que se vende mas y ordenas mejor tus compras." },
  ];

  return (
    <div className="sell-page">
      <section className="hero-band compact-hero">
        <div>
          <p className="eyebrow">Vendedores</p>
          <h1 className="hero-title">Sumate como vendedor y converti tu stock en una tienda simple</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Realiza ventas que se descuentan automaticamente de tu stock, controla los pedidos con seguimiento, verifica tus ingresos y gastos en graficos de venta y mira el balance de tu cuenta.
          </p>
          <a
            className="primary-button sell-contact"
            href={`https://wa.me/${sellerContactWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Che Rama, quiero ser vendedor en Dragon Ball Stock Manager.")}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} />
            Contactar por WhatsApp
          </a>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {benefits.map((benefit) => (
          <article className="benefit-card" key={benefit.title}>
            <benefit.icon size={22} />
            <div>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </div>
          </article>
        ))}
      </div>
      <section className="pricing-band">
        <div className="section-heading pricing-heading">
          <div>
            <p className="eyebrow">Planes</p>
            <h2>Elegi como queres pagar</h2>
          </div>
          <CheckCircle2 size={30} />
        </div>
        <div className="plan-card-grid">
          <PlanCard title="Mensual" price="$3000" text="Ideal para probar la app y mantener tu stock publicado mes a mes." />
          <PlanCard title="3 meses" price="$7500" text="Menos gestion de pagos y mejor precio por continuidad." />
          <PlanCard title="6 meses" price="$13000" text="Para vendedores que ya saben que van a usar la herramienta seguido." />
          <PlanCard title="Pago unico" price="$25000" text="Cuenta activa para siempre, sin vencimiento mensual." highlighted />
        </div>
      </section>
    </div>
  );
}

function PlanCard({ title, price, text, highlighted = false }: { title: string; price: string; text: string; highlighted?: boolean }) {
  return (
    <article className={highlighted ? "plan-card highlighted" : "plan-card"}>
      <span>{title}</span>
      <strong>{price}</strong>
      <p>{text}</p>
    </article>
  );
}
