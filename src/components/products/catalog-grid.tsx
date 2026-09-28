"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CATALOG_CATEGORIES,
  CATALOG_PRODUCTS,
  type CatalogCategorySlug,
  type CatalogProduct,
} from "@/lib/catalog-data";
import { ProductQuickView } from "@/components/products/product-quick-view";

export function CatalogGrid() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = (searchParams.get("category") as CatalogCategorySlug) || "all";
  const [searchQuery, setSearchQuery] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null);

  function handleCategoryChange(slug: CatalogCategorySlug) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const filteredProducts = useMemo(() => {
    return CATALOG_PRODUCTS.filter((product) => {
      const matchesCategory = currentCategory === "all" || product.categorySlug === currentCategory;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.fabric.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [currentCategory, searchQuery]);

  return (
    <section className="bg-background relative w-full px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-8 lg:pt-8 lg:pb-16">
      <div className="mx-auto max-w-7xl">
        {/* Title */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-primary font-sans text-2xl leading-none font-semibold tracking-normal sm:text-3xl lg:text-3xl">
              Product Catalog
            </h1>
            <p className="text-muted-foreground mt-1.5 font-mono text-sm tracking-wide">
              Curated templates and design ideas for teams, streetwear, and corporate fit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-mono text-sm font-semibold">
              {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"}
            </span>
            {currentCategory !== "all" && (
              <button
                type="button"
                onClick={() => handleCategoryChange("all")}
                className="text-primary font-mono text-xs font-normal uppercase hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar & Search Controls */}
        <div className="border-border/60 flex flex-col gap-4 border-t pt-5 md:flex-row md:items-center md:justify-between">
          {/* Category Tabs */}
          <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-2 sm:gap-2 md:pb-0">
            {CATALOG_CATEGORIES.map((cat) => {
              const isActive = currentCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => handleCategoryChange(cat.slug)}
                  aria-pressed={isActive}
                  className={`inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 md:px-2.5 md:py-1 md:text-[11px] lg:px-4 lg:py-2 lg:text-xs ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full md:w-48 lg:w-72">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 md:left-2.5 md:size-3.5 lg:left-3 lg:size-4" />
            <Input
              type="search"
              placeholder="Search fabrics or styles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card pl-9 text-sm md:h-8 md:pl-8 md:text-[11px] lg:h-9 lg:pl-9 lg:text-sm"
            />
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="my-16 flex flex-col items-center justify-center gap-3 text-center">
            <SlidersHorizontal className="text-muted-foreground size-8 stroke-1" />
            <h3 className="text-base font-semibold">No products found</h3>
            <p className="text-muted-foreground max-w-sm text-xs">
              We couldn’t find any apparel matching your criteria. Try adjusting your search query
              or selecting another category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                handleCategoryChange("all");
              }}
              className="mt-2 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 lg:gap-8">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setQuickViewProduct(product)}
                className="group bg-card/60 relative flex cursor-pointer flex-col overflow-hidden rounded-xl transition-all duration-300"
              >
                {/* Image Container */}
                <div className="bg-muted/60 relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={product.frontImage}
                    alt={`${product.name} Front`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                    className="object-cover object-center transition-all duration-500 ease-out group-hover:opacity-0"
                    priority={Boolean(product.featured)}
                  />
                  <Image
                    src={product.backImage}
                    alt={`${product.name} Back`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                    className="object-cover object-center opacity-0 transition-all duration-500 ease-out group-hover:opacity-100"
                  />
                </div>

                {/* Product Info */}
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 lg:p-6">
                  <div>
                    <span className="text-muted-foreground font-mono text-[10px] font-semibold tracking-wider uppercase sm:text-xs">
                      {product.category}
                    </span>
                    <h3 className="text-primary mt-1 line-clamp-1 font-sans text-sm font-bold uppercase sm:text-base lg:text-lg">
                      {product.name}
                    </h3>
                  </div>

                  <div className="border-border mt-3 flex items-baseline justify-between border-t pt-2.5 sm:mt-4">
                    <span className="text-muted-foreground text-[11px] font-medium uppercase sm:text-xs">
                      From
                    </span>
                    <span className="text-primary font-mono text-sm font-medium tracking-wide sm:text-base lg:text-lg">
                      {product.priceFormatted}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        open={Boolean(quickViewProduct)}
        onOpenChange={(open) => {
          if (!open) setQuickViewProduct(null);
        }}
      />
    </section>
  );
}

export function CatalogGridSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 lg:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card/60 animate-pulse overflow-hidden rounded-xl">
            <div className="bg-muted/60 aspect-[3/4] w-full" />
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="bg-muted h-3 w-16 rounded" />
              <div className="bg-muted mt-2 h-5 w-3/4 rounded" />
              <div className="border-border mt-3 flex justify-between border-t pt-2.5 sm:mt-4">
                <div className="bg-muted h-3 w-8 rounded" />
                <div className="bg-muted h-4 w-12 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
