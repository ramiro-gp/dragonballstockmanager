import { Check, CircleDollarSign, ClipboardList, CreditCard, Scale, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BalanceAdjustment, CardStock, Purchase, Sale } from "../lib/types";
import { availableQuantity, formatMoney, saleTotal } from "../lib/helpers";
import { Metric } from "../components/shared/Metric";

export function DashboardPage({
  stock,
  sales,
  purchases,
  adjustments,
}: {
  stock: CardStock[];
  sales: Sale[];
  purchases: Purchase[];
  adjustments: BalanceAdjustment[];
}) {
  const confirmed = sales.filter((sale) => sale.status === "confirmada");
  const reserved = sales.filter((sale) => sale.status === "reservada");
  const revenue = confirmed.reduce((sum, sale) => sum + saleTotal(sale), 0);
  const spent = purchases.reduce((sum, purchase) => sum + purchase.totalSpent, 0);
  const manualIncome = adjustments.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const manualExpense = adjustments.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const cardsBought = purchases.reduce((sum, purchase) => sum + purchase.totalCards, 0);
  const cardsAvailable = stock.reduce((sum, item) => sum + availableQuantity(item), 0);
  const balance = revenue + manualIncome - spent - manualExpense;

  const salesData = getCurrentMonthSalesData(confirmed);
  const purchaseKindData = filterEmptyChartRows([
    { name: "Comunes", compras: purchases.reduce((sum, item) => sum + item.commonCount, 0) },
    { name: "Fluor", compras: purchases.reduce((sum, item) => sum + item.fluorCount, 0) },
    { name: "Holo", compras: purchases.reduce((sum, item) => sum + item.holoCount, 0) },
  ], "compras");
  const expansionData = Object.entries(
    purchases.reduce<Record<string, number>>((acc, purchase) => {
      acc[purchase.topExpansion] = (acc[purchase.topExpansion] ?? 0) + purchase.totalCards;
      return acc;
    }, {}),
  ).map(([name, compras]) => ({ name, compras })).filter((row) => row.compras > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric icon={CircleDollarSign} label="Ventas confirmadas" value={formatMoney(revenue + manualIncome)} />
        <Metric icon={CreditCard} label="Compras y gastos" value={formatMoney(spent + manualExpense)} />
        <Metric icon={Scale} label="Balance" value={formatMoney(balance)} />
        <Metric icon={Sparkles} label="Cartas disponibles" value={String(cardsAvailable)} />
        <Metric icon={Check} label="Cartas compradas" value={String(cardsBought)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Ventas dentro del mes" data={salesData} dataKey="ventas" emptyText="Sin ventas confirmadas este mes." />
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

function ChartPanel({
  title,
  data,
  dataKey,
  emptyText = "Sin datos suficientes.",
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  emptyText?: string;
}) {
  const hasData = data.some((row) => Number(row[dataKey]) > 0);

  return (
    <section className="tool-surface">
      <div className="section-heading">
        <h3>{title}</h3>
        <span>{hasData ? "Datos reales" : "Sin datos"}</span>
      </div>
      {hasData ? (
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
      ) : (
        <div className="h-72 empty chart-empty">{emptyText}</div>
      )}
    </section>
  );
}

function getCurrentMonthSalesData(sales: Sale[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const ranges = [
    { name: "1-7", from: 1, to: 7 },
    { name: "8-14", from: 8, to: 14 },
    { name: "15-21", from: 15, to: 21 },
    { name: "22-31", from: 22, to: 31 },
  ];

  return ranges.map((range) => ({
    name: range.name,
    ventas: sales.reduce((sum, sale) => {
      const date = new Date(sale.createdAt);
      if (Number.isNaN(date.getTime())) return sum;
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return sum;
      const day = date.getDate();
      return day >= range.from && day <= range.to ? sum + saleTotal(sale) : sum;
    }, 0),
  }));
}

function filterEmptyChartRows<T extends Record<string, string | number>>(rows: T[], key: keyof T) {
  return rows.filter((row) => Number(row[key]) > 0);
}
