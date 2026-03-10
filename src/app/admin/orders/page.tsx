import { getOrders } from "@/actions/orders";
import { OrdersClient } from "@/components/orders/orders-client";
import Link from "next/link";

// Orders page (RSC) — fetches orders server-side
export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-sm text-zinc-500">
            Manage customer orders and payments
          </p>
        </div>
        <Link
          href="/admin/orders/new"
          className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          + New Order
        </Link>
      </div>

      <OrdersClient orders={JSON.parse(JSON.stringify(orders))} />
    </div>
  );
}
