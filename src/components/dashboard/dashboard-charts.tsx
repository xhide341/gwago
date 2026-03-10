"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  getChartData,
  type ChartData,
  type DateRange,
  type DateRangeInput,
  type DailyRevenue,
  type CategoryBreakdown,
  type OrderStatusDist,
  type PaymentMethodDist,
} from "@/actions/dashboard";
import type { DateRange as RDPDateRange } from "react-day-picker";

export type {
  DailyRevenue,
  CategoryBreakdown,
  OrderStatusDist,
  PaymentMethodDist,
};

type Props = {
  initialData: ChartData;
};

// ─── Date range options ───
const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: "1d", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
];

// ─── Color Palettes ───
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  PROCESSING: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const CATEGORY_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

const PAYMENT_COLORS: Record<string, string> = {
  CASH: "#10b981",
  GCASH: "#3b82f6",
  BANK_TRANSFER: "#f59e0b",
  CREDIT_CARD: "#8b5cf6",
  OTHER: "#6b7280",
};

// Category labels are now stored as plain strings in DB
// No mapping needed — display as-is

// Custom tooltip for dark theme
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {typeof entry.value === "number" &&
          entry.name.toLowerCase().includes("revenue")
            ? `₱${entry.value.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`
            : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-sm text-white">{data.name}</p>
      <p className="text-xs text-zinc-400">{data.value} orders</p>
    </div>
  );
}

// ─── Charts Component ───
export function DashboardCharts({ initialData }: Props) {
  const [range, setRange] = useState<DateRange>("30d");
  const [customRange, setCustomRange] = useState<RDPDateRange | undefined>(
    undefined,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [data, setData] = useState<ChartData>(initialData);
  const [isPending, startTransition] = useTransition();

  // Fetch new data when range changes
  useEffect(() => {
    if (range === "30d") {
      setData(initialData);
      return;
    }
    if (range === "custom") {
      if (!customRange?.from || !customRange?.to) return;
      startTransition(async () => {
        const result = await getChartData({
          range: "custom",
          from: customRange.from!.toISOString(),
          to: customRange.to!.toISOString(),
        });
        setData(result);
      });
      return;
    }
    startTransition(async () => {
      const result = await getChartData({ range });
      setData(result);
    });
  }, [range, customRange, initialData]);

  const {
    dailyRevenue,
    categoryBreakdown,
    orderStatusDist,
    paymentMethodDist,
  } = data;

  const rangeLabel =
    range === "custom" && customRange?.from && customRange?.to
      ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
      : (DATE_RANGES.find((r) => r.key === range)?.label ?? range);

  return (
    <div className="space-y-4 [&_.recharts-surface]:outline-none [&_.recharts-surface]:ring-0 [&_.recharts-surface:focus]:outline-none [&_.recharts-surface:focus]:ring-0 [&_.recharts-wrapper]:outline-none [&_.recharts-wrapper]:ring-0 [&_.recharts-wrapper:focus]:outline-none [&_.recharts-wrapper:focus]:ring-0">
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {DATE_RANGES.map((r) => (
          <Button
            key={r.key}
            variant={range === r.key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setRange(r.key);
              if (r.key !== "custom") setCustomRange(undefined);
            }}
            className={
              range === r.key
                ? "bg-white text-black hover:bg-zinc-200 focus-visible:ring-0 focus-visible:outline-none"
                : "border-zinc-700 text-zinc-400 hover:text-white focus-visible:ring-0 focus-visible:outline-none"
            }
          >
            {r.label}
          </Button>
        ))}

        {/* Custom Date Range Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={range === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setRange("custom")}
              className={
                range === "custom"
                  ? "bg-white text-black hover:bg-zinc-200 focus-visible:ring-0 focus-visible:outline-none"
                  : "border-zinc-700 text-zinc-400 hover:text-white focus-visible:ring-0 focus-visible:outline-none"
              }
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {range === "custom" && customRange?.from && customRange?.to
                ? `${format(customRange.from, "MMM d, yyyy")} – ${format(customRange.to, "MMM d, yyyy")}`
                : "Custom Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-zinc-700 bg-zinc-900 p-0"
            align="start"
          >
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={(selected) => {
                setCustomRange(selected);
                if (selected?.from && selected?.to) {
                  setRange("custom");
                  setCalendarOpen(false);
                }
              }}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              className="text-white"
            />
          </PopoverContent>
        </Popover>

        {isPending && (
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-zinc-500" />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Revenue & Orders ({rangeLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-75 min-h-75">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  accessibilityLayer={false}
                  data={dailyRevenue}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickLine={{ stroke: "#3f3f46" }}
                    axisLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickLine={{ stroke: "#3f3f46" }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickLine={{ stroke: "#3f3f46" }}
                    axisLine={{ stroke: "#3f3f46" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="orders"
                    dataKey="orders"
                    name="Orders"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base text-white">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-62.5 min-h-62.5">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart accessibilityLayer={false}>
                  <Pie
                    data={orderStatusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                    label={({ name, value }: any) => `${name} (${value})`}
                  >
                    {orderStatusDist.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-62.5 min-h-62.5">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  accessibilityLayer={false}
                  data={categoryBreakdown.map((c) => ({
                    ...c,
                    label: c.category,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickLine={{ stroke: "#3f3f46" }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={70}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
                          <p className="text-sm text-white">{d.label}</p>
                          <p className="text-xs text-zinc-400">
                            ₱{d.revenue.toLocaleString("en-PH")} · {d.count}{" "}
                            items sold
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                    {categoryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {paymentMethodDist.map((pm) => {
                const total = paymentMethodDist.reduce(
                  (s, p) => s + p.amount,
                  0,
                );
                const pct =
                  total > 0 ? ((pm.amount / total) * 100).toFixed(1) : "0";
                const color = PAYMENT_COLORS[pm.method] || "#6b7280";
                return (
                  <div
                    key={pm.method}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-400">
                        {pm.method.replace("_", " ")}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {pm.count} txns
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">
                      ₱
                      {pm.amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 0,
                      })}
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-zinc-600">
                      {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
