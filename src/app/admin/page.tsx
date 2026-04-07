import { Package, AlertTriangle, ShoppingCart, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { getChartData } from "@/actions/dashboard";

// ─── Dashboard Page (RSC) ───
export default async function DashboardPage() {
  // Parallel data fetching for stats + default 30d chart data
  const [productCount, lowStockCount, pendingOrders, todayRevenue, chartData] =
    await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.inventoryStock
        .findMany({
          select: {
            quantity: true,
            reorderLevel: true,
          },
        })
        .then(
          (stocks) =>
            stocks.filter((stock) => stock.quantity <= stock.reorderLevel)
              .length,
        ),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.transaction
        .aggregate({
          where: {
            type: "PAYMENT",
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          _sum: { amount: true },
        })
        .then((r) => r._sum.amount ?? 0),
      getChartData({ range: "30d" }),
    ]);

  // Stat cards data
  const stats = [
    {
      title: "Active Products",
      value: productCount,
      icon: Package,
      description: "Total active products",
    },
    {
      title: "Low Stock Alerts",
      value: lowStockCount,
      icon: AlertTriangle,
      description: "are low on stock",
      alert: lowStockCount > 0,
    },
    {
      title: "Pending Orders",
      value: pendingOrders,
      icon: ShoppingCart,
      description: "Awaiting processing",
    },
    {
      title: "Today's Revenue",
      value: `₱${todayRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "Total payments today",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Overview of your printing business
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.alert ? "text-yellow-500" : "text-zinc-500"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="mt-1 text-xs text-zinc-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      <DashboardCharts initialData={chartData} />
    </div>
  );
}
