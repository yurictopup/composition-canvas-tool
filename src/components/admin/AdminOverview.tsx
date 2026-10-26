import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Trophy,
  Truck,
  Users,
} from "lucide-react";
import type { AdminOrder } from "./types";
import { StatusBadge } from "./StatusBadge";

const C = {
  primary: "#2F5FE0",
  primarySoft: "rgba(47,95,224,0.16)",
  success: "#28C76F",
  info: "#3FA2F0",
  warning: "#FF9F43",
  danger: "#FF4C51",
  secondary: "#7A86A3",
  grid: "var(--vx-border)",
  muted: "#8E9BB8",
};

const STATUS_COLORS: Record<string, string> = {
  completed: C.success,
  processing: C.info,
  pending: C.warning,
  failed: C.danger,
  refunded: C.secondary,
};

export const money = (n: number) => `$${n.toFixed(2)}`;
const paid = (o: AdminOrder) => o.status === "completed";
const sum = (list: AdminOrder[]) => list.reduce((s, o) => s + Number(o.price_usd), 0);

function dayKey(d: Date) {
  return d.toDateString();
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`vx-card ${className}`}>{children}</div>;
}

function CardHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h5 className="text-base font-medium leading-tight">{title}</h5>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--vx-muted)]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function IconBubble({ color, children, size = 40 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md"
      style={{ width: size, height: size, color, background: `${color}29` }}
    >
      {children}
    </span>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="vx-card px-3 py-2 text-xs">
      {label && <div className="mb-1 font-medium text-[var(--vx-heading)]">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium text-[var(--vx-heading)]">
            {p.name.toLowerCase().includes("order") ? p.value : money(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminOverview({
  orders,
  allOrders,
  ownerName,
  onOpenOrders,
}: {
  /** Orders in the selected time range. */
  orders: AdminOrder[];
  /** Every loaded order, for the fixed-window charts. */
  allOrders: AdminOrder[];
  ownerName: string;
  onOpenOrders: () => void;
}) {
  const revenue = sum(orders.filter(paid));
  const grossProfit = revenue; // no cost data yet
  const pending = orders.filter((o) => o.status === "pending");
  const processing = orders.filter((o) => o.status === "processing");
  const completed = orders.filter(paid);
  const failed = orders.filter((o) => o.status === "failed");
  const customers = new Set(orders.map((o) => o.user_email)).size;

  // Last 7 days, and the 7 days before that for the growth figure.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const list = allOrders.filter((o) => dayKey(new Date(o.created_at)) === dayKey(d));
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      Revenue: sum(list.filter(paid)),
      Orders: list.length,
    };
  });
  const thisWeek = days.slice(7);
  const weekRevenue = thisWeek.reduce((s, d) => s + d.Revenue, 0);
  const lastWeekRevenue = days.slice(0, 7).reduce((s, d) => s + d.Revenue, 0);
  const weekOrders = thisWeek.reduce((s, d) => s + d.Orders, 0);
  const lastWeekOrders = days.slice(0, 7).reduce((s, d) => s + d.Orders, 0);
  const growth =
    lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : weekRevenue > 0 ? 100 : 0;
  const orderGrowth =
    lastWeekOrders > 0 ? ((weekOrders - lastWeekOrders) / lastWeekOrders) * 100 : weekOrders > 0 ? 100 : 0;
  const bestDay = thisWeek.reduce((m, d, i) => (d.Revenue > thisWeek[m]!.Revenue ? i : m), 0);

  // Last 12 months.
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    const list = allOrders.filter((o) => {
      const od = new Date(o.created_at);
      return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    });
    return {
      label: d.toLocaleDateString("en", { month: "short" }),
      Revenue: sum(list.filter(paid)),
      Unpaid: sum(list.filter((o) => o.status === "pending" || o.status === "failed")),
    };
  });
  const yearRevenue = months.reduce((s, m) => s + m.Revenue, 0);

  const statusData = ["completed", "processing", "pending", "failed", "refunded"].map((s) => ({
    name: s,
    value: orders.filter((o) => o.status === s).length,
  }));
  const hasStatus = statusData.some((s) => s.value > 0);

  const byGame = new Map<string, { revenue: number; count: number }>();
  for (const o of orders) {
    const g = byGame.get(o.game_name) ?? { revenue: 0, count: 0 };
    g.count += 1;
    if (paid(o)) g.revenue += Number(o.price_usd);
    byGame.set(o.game_name, g);
  }
  const topGames = [...byGame.entries()].sort((a, b) => b[1].revenue - a[1].revenue || b[1].count - a[1].count).slice(0, 5);
  const topMax = Math.max(...topGames.map(([, g]) => g.revenue), 1);
  const gameColors = [C.primary, C.success, C.info, C.warning, C.danger];

  const stats = [
    { label: "Sales", value: String(orders.length), icon: <TrendingUp size={20} />, color: C.primary },
    { label: "Customers", value: String(customers), icon: <Users size={20} />, color: C.info },
    { label: "Paid orders", value: String(completed.length), icon: <ShoppingCart size={20} />, color: C.danger },
    { label: "Revenue", value: money(revenue), icon: <DollarSign size={20} />, color: C.success },
  ];

  const alerts = [
    { label: "Pending payments", sub: "Waiting for Bakong", count: pending.length, icon: <Clock size={20} />, color: C.warning },
    { label: "Paid not delivered", sub: "Needs delivery", count: processing.length, icon: <Truck size={20} />, color: C.info },
    { label: "Failed deliveries", sub: "Check and retry", count: failed.length, icon: <AlertTriangle size={20} />, color: C.danger },
    { label: "All orders", sub: "In this period", count: orders.length, icon: <Package size={20} />, color: C.primary },
  ];

  const profit = [
    { label: "Revenue", sub: "From paid orders", value: revenue, color: C.success },
    { label: "Order cost", sub: "Supplier / buy cost", value: 0, color: C.danger },
    { label: "Gross profit", sub: "Before refunds & expense", value: grossProfit, color: C.primary },
    { label: "Refunds", sub: "Money returned", value: 0, color: C.secondary },
    { label: "Other income", sub: "Outside orders", value: 0, color: C.info },
    { label: "Expense / loss", sub: "Other costs", value: 0, color: C.warning },
  ];

  const recent = orders.slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Congratulations */}
      <Card className="relative overflow-hidden lg:col-span-4">
        <div className="p-5">
          <h5 className="text-base font-medium">Congratulations {ownerName}!</h5>
          <p className="text-[13px]">Revenue in this period</p>
          <h4 className="mt-3 text-xl font-medium" style={{ color: C.primary }}>
            {money(revenue)}
          </h4>
          <p className="mt-1 text-[13px]">{completed.length} paid orders</p>
          <button onClick={onOpenOrders} className="vx-btn mt-4 px-4 py-2 text-sm font-medium">
            View Sales
          </button>
        </div>
        <div className="pointer-events-none absolute bottom-4 right-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: C.primarySoft }}>
          <Trophy size={40} color={C.warning} strokeWidth={1.6} />
        </div>
      </Card>

      {/* Statistics */}
      <Card className="flex flex-col lg:col-span-8">
        <CardHead title="Statistics" right={<span className="text-[13px] text-[var(--vx-muted)]">Updated just now</span>} />
        <div className="grid flex-1 grid-cols-2 content-center gap-4 p-5 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <IconBubble color={s.color} size={36}>
                {s.icon}
              </IconBubble>
              <div>
                <h5 className="text-lg font-semibold leading-tight">{s.value}</h5>
                <p className="text-[13px]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Orders (small) */}
      <Card className="lg:col-span-3">
        <CardHead title="Orders" sub="Last 7 days" />
        <div className="h-24 px-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={thisWeek} barSize={8}>
              <Tooltip content={<ChartTip />} cursor={false} />
              <Bar dataKey="Orders" radius={[4, 4, 4, 4]} fill={C.warning} background={{ fill: "var(--vx-track)", radius: 4 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between px-5 pb-5 pt-2">
          <h4 className="text-xl font-medium text-[var(--vx-heading)]">{weekOrders}</h4>
          <Trend value={orderGrowth} />
        </div>
      </Card>

      {/* Sales (small) */}
      <Card className="lg:col-span-3">
        <CardHead title="Sales" sub="Last 7 days" />
        <div className="h-24 px-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={thisWeek} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="vxSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.success} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<ChartTip />} cursor={false} />
              <Area type="monotone" dataKey="Revenue" stroke={C.success} strokeWidth={2} fill="url(#vxSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between px-5 pb-5 pt-2">
          <h4 className="text-xl font-medium text-[var(--vx-heading)]">{money(weekRevenue)}</h4>
          <Trend value={growth} />
        </div>
      </Card>

      {/* Revenue Growth */}
      <Card className="lg:col-span-6">
        <div className="grid h-full grid-cols-1 gap-4 p-5 sm:grid-cols-5">
          <div className="flex flex-col justify-between sm:col-span-2">
            <div>
              <h5 className="text-base font-medium">Revenue Growth</h5>
              <p className="text-[13px] text-[var(--vx-muted)]">Weekly report</p>
            </div>
            <div className="mt-6">
              <h4 className="text-xl font-medium text-[var(--vx-heading)]">{money(weekRevenue)}</h4>
              <span
                className="mt-2 inline-block rounded px-2 py-0.5 text-[13px] font-medium"
                style={{ color: growth >= 0 ? C.success : C.danger, background: `${growth >= 0 ? C.success : C.danger}29` }}
              >
                {growth >= 0 ? "+" : ""}
                {growth.toFixed(1)}%
              </span>
              <p className="mt-2 text-[13px]">Compared to last week</p>
            </div>
          </div>
          <div className="h-36 sm:col-span-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={thisWeek} barSize={26}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
                <Tooltip content={<ChartTip />} cursor={false} />
                <Bar dataKey="Revenue" radius={[6, 6, 6, 6]} minPointSize={6}>
                  {thisWeek.map((_, i) => (
                    <Cell key={i} fill={i === bestDay && weekRevenue > 0 ? C.primary : C.primarySoft} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Revenue Report */}
      <Card className="lg:col-span-8">
        <CardHead
          title="Revenue Report"
          sub="Last 12 months"
          right={
            <div className="text-right">
              <div className="text-xl font-medium text-[var(--vx-heading)]">{money(yearRevenue)}</div>
              <div className="text-[13px] text-[var(--vx-muted)]">Total revenue</div>
            </div>
          }
        />
        <div className="flex gap-5 px-5 pt-3 text-[13px]">
          <Legend color={C.primary} label="Revenue (paid)" />
          <Legend color={C.warning} label="Unpaid / failed" />
        </div>
        <div className="h-60 px-3 pb-3 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} barGap={4} barSize={10}>
              <CartesianGrid stroke={C.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: C.muted, fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(47,95,224,0.06)" }} />
              <Bar dataKey="Revenue" fill={C.primary} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Unpaid" fill={C.warning} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Finance alerts */}
      <Card className="lg:col-span-4">
        <CardHead title="Finance alerts" sub="Attention needed" />
        <ul className="space-y-3.5 p-5">
          {alerts.map((a) => (
            <li key={a.label}>
              <button onClick={onOpenOrders} className="flex w-full items-center gap-4 text-left">
                <IconBubble color={a.color}>{a.icon}</IconBubble>
                <div className="min-w-0 flex-1">
                  <h6 className="text-[15px] font-medium text-[var(--vx-heading)]">{a.label}</h6>
                  <p className="text-[13px] text-[var(--vx-muted)]">{a.sub}</p>
                </div>
                <span className="font-medium" style={{ color: a.count > 0 && a.label !== "All orders" ? a.color : undefined }}>
                  {a.count}
                </span>
                <ChevronRight size={16} className="text-[var(--vx-muted)]" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Order statistics */}
      <Card className="lg:col-span-4">
        <CardHead title="Order Statistics" sub={`${orders.length} total orders`} />
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <h3 className="text-xl font-medium">{completed.length}</h3>
            <p className="text-[13px]">Completed</p>
          </div>
          <div className="relative h-24 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hasStatus ? statusData : [{ name: "none", value: 1 }]}
                  dataKey="value"
                  innerRadius={34}
                  outerRadius={46}
                  paddingAngle={hasStatus ? 2 : 0}
                  stroke="none"
                >
                  {(hasStatus ? statusData : [{ name: "none" }]).map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "var(--vx-track)"} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-medium text-[var(--vx-heading)]">
                {orders.length ? Math.round((completed.length / orders.length) * 100) : 0}%
              </span>
              <span className="text-[11px]">Paid</span>
            </div>
          </div>
        </div>
        <ul className="space-y-3 p-5">
          {statusData.map((s) => (
            <li key={s.name} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
              <span className="flex-1 capitalize">{s.name}</span>
              <span className="font-medium text-[var(--vx-heading)]">{s.value}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Profit summary */}
      <Card className="lg:col-span-4">
        <CardHead
          title="Profit Summary"
          sub="Net profit after all adjustments"
          right={<span className="text-xl font-medium" style={{ color: C.primary }}>{money(grossProfit)}</span>}
        />
        <ul className="space-y-3 p-5">
          {profit.map((p) => (
            <li key={p.label} className="flex items-center gap-4">
              <IconBubble color={p.color} size={34}>
                <CreditCard size={18} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <h6 className="text-[15px] font-medium text-[var(--vx-heading)]">{p.label}</h6>
                <p className="text-[13px] text-[var(--vx-muted)]">{p.sub}</p>
              </div>
              <span className="font-medium text-[var(--vx-heading)]">{money(p.value)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Top games */}
      <Card className="lg:col-span-4">
        <CardHead title="Top Games" sub="By paid revenue" />
        {topGames.length === 0 ? (
          <p className="p-5 text-[13px] text-[var(--vx-muted)]">No orders yet.</p>
        ) : (
          <ul className="space-y-3.5 p-5">
            {topGames.map(([name, g], i) => (
              <li key={name}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-medium text-[var(--vx-heading)]">{name}</span>
                  <span className="text-[13px]">
                    {money(g.revenue)} · {g.count} orders
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--vx-track)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, (g.revenue / topMax) * 100)}%`, background: gameColors[i] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent orders */}
      <Card className="overflow-hidden lg:col-span-12">
        <CardHead
          title="Recent Orders"
          right={
            <button onClick={onOpenOrders} className="text-[13px] font-medium" style={{ color: C.primary }}>
              View all
            </button>
          }
        />
        {recent.length === 0 ? (
          <p className="p-5 text-[13px] text-[var(--vx-muted)]">មិនទាន់មាន orders ទេ</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="vx-table w-full text-sm">
              <thead className="border-y border-[var(--vx-border)]">
                <tr className="text-left">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Game</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vx-border)]">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3 font-medium" style={{ color: C.primary }}>
                      #{o.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3">{o.user_email}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-[var(--vx-heading)]">{o.game_name}</span>
                      <span className="text-[var(--vx-muted)]"> · {o.package_amt}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-[var(--vx-heading)]">{money(Number(o.price_usd))}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className="flex items-center gap-0.5 text-[13px] font-medium" style={{ color: up ? C.success : C.danger }}>
      {up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
