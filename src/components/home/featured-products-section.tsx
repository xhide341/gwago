import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CATALOG_PRODUCTS } from "@/lib/catalog-data";

const FEATURED_PRODUCTS = CATALOG_PRODUCTS.filter((p) => p.featured).map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.priceFormatted,
  frontImage: p.frontImage,
  backImage: p.backImage,
  href: `/products?category=${p.categorySlug}`,
}));

export function FeaturedProductsSection() {
  return (
    <section
      className="bg-background relative w-full px-4 py-6 sm:py-8 md:py-10 lg:px-10 lg:pt-20 lg:pb-14 xl:px-14"
      aria-label="Featured Products"
    >
      <div className="w-full">
        {/* Section Header */}
        <div className="mb-8 flex flex-col items-center justify-between gap-6 text-center md:mb-12 lg:mb-14 lg:flex-row lg:items-end lg:text-left">
          <div className="flex max-w-4xl flex-col items-center text-center lg:items-start lg:text-left">
            <h2 className="text-primary mt-2 font-sans text-3xl leading-[1.05] font-black tracking-tighter uppercase sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl">
              BUILT FOR THE COURT <br /> & THE STREETS
            </h2>
          </div>

          <Link
            href="/products"
            className="group text-primary hover:border-primary inline-flex items-center gap-2 self-center border-b border-transparent pb-1.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 sm:text-sm lg:self-end"
          >
            <span>View Full Catalog</span>
            <ArrowUpRight className="size-4 transition-transform duration-200" />
          </Link>
        </div>

        {/*  4-Item Minimalist Product Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {FEATURED_PRODUCTS.map((product) => (
            <Link
              key={product.id}
              href={product.href}
              className="group bg-card/60 relative flex flex-col overflow-hidden rounded-xl transition-all duration-300"
            >
              {/* Image Container */}
              <div className="bg-muted/60 relative aspect-3/4 w-full overflow-hidden">
                <Image
                  src={product.frontImage}
                  alt={`${product.name} Front`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                  className="object-cover object-center transition-all duration-500 ease-out group-hover:opacity-0"
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
                  <h3 className="text-primary mt-1 line-clamp-1 font-sans text-sm font-bold uppercase transition-colors sm:text-base lg:text-lg">
                    {product.name}
                  </h3>
                </div>

                <div className="border-border mt-3 flex items-baseline justify-between border-t pt-2.5 sm:mt-4">
                  <span className="text-muted-foreground text-[11px] font-medium uppercase sm:text-xs">
                    From
                  </span>
                  <span className="text-primary font-mono text-sm font-medium tracking-wide sm:text-base lg:text-lg">
                    {product.price}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProductsSection;
