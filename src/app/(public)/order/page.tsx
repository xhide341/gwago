import { Suspense } from "react";
import type { Metadata } from "next";

import { CATALOG_PRODUCTS } from "@/lib/catalog-data";
import { NormalOrderForm } from "@/components/orders/normal-order-form";
import { SubpageHeader } from "@/components/subpage-header";
import { FooterSection } from "@/components/footer-section";

export const metadata: Metadata = {
  title: "Order Apparel | Gwago Printing Services",
  description:
    "Customize and place your order for team jerseys, warmup hoodies, corporate polos, and streetwear apparel. Customize numbers, names, and team branding with volume discounts.",
};

interface OrderPageProps {
  searchParams: Promise<{ product?: string; custom?: string }>;
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const { product: initialProductId, custom } = await searchParams;

  return (
    <main className="bg-background flex min-h-svh flex-col justify-between">
      <div className="flex-1">
        <SubpageHeader backHref="/products" backLabel="Back to Products" />
        <Suspense
          fallback={
            <div className="text-muted-foreground p-12 text-center">Loading order details...</div>
          }
        >
          <NormalOrderForm
            initialProductId={initialProductId}
            catalogProducts={CATALOG_PRODUCTS}
            initialCustomOpen={custom === "true"}
          />
        </Suspense>
      </div>
      <FooterSection />
    </main>
  );
}
