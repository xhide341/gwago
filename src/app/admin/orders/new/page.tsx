import { getProducts } from "@/actions/products";
import { OrderCreateForm } from "@/components/orders/order-create-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewOrderPage() {
  const products = await getProducts();

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
          <h1 className="text-2xl font-bold text-white">New Order</h1>
          <p className="text-sm text-zinc-500">Create a new customer order</p>
        </div>
      </div>

      <OrderCreateForm products={JSON.parse(JSON.stringify(products))} />
    </div>
  );
}
