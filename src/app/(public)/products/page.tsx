import { Suspense } from "react";
import type { Metadata } from "next";
import { SubpageHeader } from "@/components/subpage-header";
import { ProductHeader } from "@/components/products/product-header";
import { CatalogGrid, CatalogGridSkeleton } from "@/components/products/catalog-grid";
import { FooterSection } from "@/components/footer-section";

export const metadata: Metadata = {
  title: "Products | Gwago Printing Services",
  description:
    "Explore Gwago's custom apparel catalog: full-sublimation basketball jerseys, streetwear hoodies, coaching zipper polos, and performance tees.",
};

export default function ProductsPage() {
  return (
    <main className="bg-background min-h-svh">
      <SubpageHeader backHref="/" backLabel="Back to Home" />
      <ProductHeader />
      <Suspense fallback={<CatalogGridSkeleton />}>
        <CatalogGrid />
      </Suspense>
      <FooterSection />
    </main>
  );
}
