import { Check, CircleDollarSign, ClipboardList, CreditCard, Scale, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CardStock, Purchase, Sale } from "../lib/types";
import { availableQuantity, formatMoney, saleTotal } from "../lib/helpers";
import { Metric } from "../components/shared/Metric";

export function DashboardPage({ stock, sales, purchases }: { stock: CardStock[]; sales: Sale[]; purchases: Purchase[] }) {
  const confirmed = sales.filter((sale) => sale.status === "confirmada");
  const reserved = sales.filter((sale) => sale.status === "reservada");
  const revenue = confirmed.reduce((sum, sale) => sum + saleTotal(sale), 0);
  const spent = purchases.reduce((sum, purchase) => sum + purchase.totalSpent, 0);
  const cardsBought = purchases.reduce((sum, purchase) => sum + purchase.totalCards, 0);
  const cardsAvailable = stock.reduce((sum, item) => sum + availableQuantity(item), 0);
  const salesData = [
    { name: "1-7", ventas: 19300 },
    { name: "8-14", ventas: 6200 },
    { name: "15-21", ventas: 12800 },
    { name: "22-30", ventas: 9300 },
  ];
  const purchaseKindData = [
    { name: "Comunes", compras: purchases.reduce((sum, item) => sum + item.commonCount, 0) },
    { name: "Fluor", compras: purchases.reduce((sum, item) => sum + item.fluorCount, 0) },
    { name: "Holo", compras: purchases.reduce((sum, item) => sum + item.holoCount, 0) },
  ];
  const expansionData = Object.entries(
    purchases.reduce<Record<string, number>>((acc, purchase) => {
      acc[purchase.topExpansion] = (acc[purchase.topExpansion] ?? 0) + purchase.totalCards;
      return acc;
    }, {}),
  ).map(([name, compras]) => ({ name, compras }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric icon={CircleDollarSign} label="Ventas confirmadas" value={formatMoney(revenue)} />
        <Metric icon={CreditCard} label="Compras cargadas" value={formatMoney(spent)} />
        <Metric icon={Scale} label="Balance" value={formatMoney(revenue - spent)} />
        <Metric icon={Sparkles} label="Cartas disponibles" value={String(cardsAvailable)} />
        <Metric icon={Check} label="Cartas compradas" value={String(cardsBought)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Ventas dentro del mes" data={salesData} dataKey="ventas" />
        <ChartPanel title="Compras por tipo" data={purchaseKindData} dataKey="compras" />
        <ChartPanel title="Expansiones más compradas" data={expansionData} dataKey="compras" />
        <section className="tool-surface">
          <div className="section-heading">
            <h3>Pedidos</h3>
            <span>Resumen operativo</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Metric icon={ClipboardList} label="Reservas activas" value={String(reserved.length)} />
            <Metric icon={Check} label="Pedidos cerrados" value={String(confirmed.length)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ChartPanel({ title, data, dataKey }: { title: string; data: Array<Record<string, string | number>>; dataKey: string }) {
  return (
    <section className="tool-surface">
      <div className="section-heading">
        <h3>{title}</h3>
        <span>Mock inicial</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="name" stroke="var(--muted)" />
            <YAxis stroke="var(--muted)" />
            <Tooltip formatter={(value) => typeof value === "number" && value > 2000 ? formatMoney(value) : value} />
            <Bar dataKey={dataKey} fill="var(--orange)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
