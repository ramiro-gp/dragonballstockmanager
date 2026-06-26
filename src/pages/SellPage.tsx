import { BarChart3, CheckCircle2, ClipboardCheck, Link, MessageCircle, PackageCheck, SearchCheck, WalletCards } from "lucide-react";

const sellerContactWhatsapp = import.meta.env.VITE_SELLER_CONTACT_WHATSAPP || "5491151354489";

export function SellPage() {
  const benefits = [
    { icon: Link, title: "Link propio", text: "Compartís tu stock con un link simple y cada cliente consulta lo que le falta sin pedirte capturas." },
    { icon: SearchCheck, title: "Búsqueda por lista", text: "El cliente pega sus faltantes y ve rápido qué tenés disponible, con variantes y precios." },
    { icon: PackageCheck, title: "Stock automático", text: "Publicás cartas o productos y cada venta confirmada se descuenta automáticamente del stock." },
    { icon: ClipboardCheck, title: "Pedidos en seguimiento", text: "Cada consulta queda como pedido pendiente para reservar, confirmar o cancelar cuando arreglás por WhatsApp." },
    { icon: WalletCards, title: "Balance claro", text: "Controlás ingresos, gastos, señas y saldos sin tener todo mezclado en papel o chats." },
    { icon: BarChart3, title: "Gráficos de venta", text: "Ves cómo viene tu movimiento, detectás qué se vende más y ordenás mejor tus compras." },
  ];

  return (
    <div className="sell-page">
      <section className="hero-band compact-hero">
        <div>
          <p className="eyebrow">Vendedores</p>
          <h1 className="hero-title">Sumate como vendedor y convertí tu stock en una tienda simple</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Realizá ventas que se descuentan automáticamente de tu stock, controlá los pedidos con seguimiento, verificá tus ingresos y gastos en gráficos de venta y mirá el balance de tu cuenta.
          </p>
          <a
            className="primary-button sell-contact"
            href={`https://wa.me/${sellerContactWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hola Rama, quiero vender mis cosas en Dragon Ball Stock Manager.")}`}
            target="_blank"
            rel="noopener noreferrer"
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
            <h2>Elegí cómo querés pagar</h2>
          </div>
          <CheckCircle2 size={30} />
        </div>
        <div className="plan-card-grid">
          <PlanCard title="Mensual" price="$3000" text="Ideal para probar la app y mantener tu stock publicado mes a mes." />
          <PlanCard title="3 meses" price="$7500" text="Menos gestión de pagos y mejor precio por continuidad." />
          <PlanCard title="6 meses" price="$13000" text="Para vendedores que ya saben que van a usar la herramienta seguido." />
          <PlanCard title="Pago único" price="$25000" text="Cuenta activa para siempre, sin vencimiento mensual." highlighted />
        </div>
      </section>
    </div>
  );
}

function PlanCard({ title, price, text, highlighted = false }: { title: string; price: string; text: string; highlighted?: boolean }) {
  return (
    <article className={highlighted ? "plan-card highlighted" : "plan-card"}>
      <span>{title}</span>

      <div className="flex justify-between items-center">
        <strong>{price}</strong>
        
        <a
            className="primary-button"
            href={`https://wa.me/${sellerContactWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hola Rama, quiero vender mis cosas en Dragon Ball Stock Manager.")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            +
        </a>
      </div>

      <p>{text}</p>
    </article>
  );
}
