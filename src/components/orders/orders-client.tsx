"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

// ─── Constants ───
const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const channelStyles: Record<string, string> = {
  DIRECT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  SHOPEE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  LAZADA: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  TIKTOK: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  OTHER: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const channelLabels: Record<string, string> = {
  DIRECT: "Direct",
  SHOPEE: "Shopee",
  LAZADA: "Lazada",
  TIKTOK: "TikTok",
  OTHER: "Other",
};

// ─── Types ───
type Order = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  salesChannel: string;
  channelFee: number;
  totalAmount: number;
  netAmount: number;
  notes: string | null;
  createdAt: string;
  _count: { items: number };
};

// ─── Main Component ───
export function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = orders.filter((order) => {
    const matchSearch =
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
          <Input
            placeholder="Search by customer or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 border-zinc-800 bg-zinc-900 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-950">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-400">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No orders found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Channel</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Deduction</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() =>
                        router.push(`/admin/orders/${order.id}/edit`)
                      }
                      className="cursor-pointer transition-colors hover:bg-zinc-800/50"
                    >
                      <td className="py-3 font-mono text-xs text-zinc-400">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 text-white">{order.customerName}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            channelStyles[order.salesChannel] ??
                            channelStyles.OTHER
                          }
                        >
                          {channelLabels[order.salesChannel] ??
                            order.salesChannel}
                        </Badge>
                      </td>
                      <td className="py-3 text-zinc-400">
                        {order._count.items} item
                        {order._count.items !== 1 ? "s" : ""}
                      </td>
                      <td className="py-3 font-medium text-white">
                        ₱
                        {order.totalAmount.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 text-zinc-400">
                        {(order.channelFee ?? 0) > 0 ? (
                          <span className="text-red-400">
                            -₱
                            {(order.channelFee ?? 0).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={statusStyles[order.status]}
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-zinc-500">
                        {new Date(order.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
