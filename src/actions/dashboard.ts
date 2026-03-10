"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DailyRevenue = { date: string; revenue: number; orders: number };
export type CategoryBreakdown = {
  category: string;
  count: number;
  revenue: number;
};
export type OrderStatusDist = { status: string; count: number };
export type PaymentMethodDist = {
  method: string;
  count: number;
  amount: number;
};

export type ChartData = {
  dailyRevenue: DailyRevenue[];
  categoryBreakdown: CategoryBreakdown[];
  orderStatusDist: OrderStatusDist[];
  paymentMethodDist: PaymentMethodDist[];
};

// Accepted range keys
export type DateRange = "1d" | "7d" | "30d" | "custom";

export type DateRangeInput =
  | { range: "1d" | "7d" | "30d" }
  | { range: "custom"; from: string; to: string }; // ISO date strings

function getDateBounds(input: DateRangeInput): { start: Date; end: Date } {
  if (input.range === "custom") {
    const start = new Date(input.from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(input.to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);

  switch (input.range) {
    case "1d":
      return { start: now, end };
    case "7d":
      now.setDate(now.getDate() - 7);
      return { start: now, end };
    case "30d":
    default:
      now.setDate(now.getDate() - 30);
      return { start: now, end };
  }
}

export async function getChartData(input: DateRangeInput): Promise<ChartData> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { start: startDate, end: endDate } = getDateBounds(input);

  const dateFilter = { gte: startDate, lte: endDate };

  // --- Daily revenue + order count ---
  const transactions = await prisma.transaction.findMany({
    where: { type: "PAYMENT", createdAt: dateFilter },
    select: { createdAt: true, amount: true, orderId: true },
  });

  const revenueByDay = new Map<
    string,
    { revenue: number; orderIds: Set<string> }
  >();
  for (const t of transactions) {
    const day = t.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
    const entry = revenueByDay.get(day) ?? {
      revenue: 0,
      orderIds: new Set<string>(),
    };
    entry.revenue += t.amount;
    entry.orderIds.add(t.orderId);
    revenueByDay.set(day, entry);
  }

  const dailyRevenue: DailyRevenue[] = [...revenueByDay.entries()].map(
    ([date, { revenue, orderIds }]) => ({
      date,
      revenue,
      orders: orderIds.size,
    }),
  );

  // --- Order status distribution ---
  const statusGroups = await prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: dateFilter },
    _count: { _all: true },
  });

  const orderStatusDist: OrderStatusDist[] = statusGroups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }));

  // --- Revenue by product category ---
  const [orderItems, productCategories] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: { status: { not: "CANCELLED" }, createdAt: dateFilter },
      },
      select: {
        quantity: true,
        subtotal: true,
        variant: { select: { product: { select: { category: true } } } },
      },
    }),
    prisma.product.findMany({
      distinct: ["category"],
      select: { category: true },
    }),
  ]);

  const catMap = new Map<string, { count: number; revenue: number }>(
    productCategories.map((p) => [p.category, { count: 0, revenue: 0 }]),
  );
  for (const oi of orderItems) {
    const cat = oi.variant.product.category;
    const entry = catMap.get(cat) ?? { count: 0, revenue: 0 };
    entry.count += oi.quantity;
    entry.revenue += oi.subtotal;
    catMap.set(cat, entry);
  }

  const categoryBreakdown: CategoryBreakdown[] = [...catMap.entries()]
    .map(([category, { count, revenue }]) => ({ category, count, revenue }))
    .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category));

  // --- Payment method distribution ---
  const methodGroups = await prisma.transaction.groupBy({
    by: ["method"],
    where: { type: "PAYMENT", createdAt: dateFilter },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const paymentMethodDist: PaymentMethodDist[] = methodGroups
    .map((g) => ({
      method: g.method,
      count: g._count._all,
      amount: g._sum.amount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    dailyRevenue,
    categoryBreakdown,
    orderStatusDist,
    paymentMethodDist,
  };
}
