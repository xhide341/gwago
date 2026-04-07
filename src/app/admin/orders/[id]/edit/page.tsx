import { getOrderById } from "@/actions/orders";
import { getOrderableProducts } from "@/actions/products";
import { OrderEditForm } from "@/components/orders/order-edit-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, products] = await Promise.all([
    getOrderById(id),
    getOrderableProducts(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Order</h1>
          <p className="font-mono text-sm text-zinc-500">
            Order ID: {order.id}
          </p>
        </div>
      </div>

      <OrderEditForm
        order={JSON.parse(JSON.stringify(order))}
        products={JSON.parse(JSON.stringify(products))}
      />
    </div>
  );
}
