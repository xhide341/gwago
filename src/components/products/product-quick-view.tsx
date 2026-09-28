"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Layers, Scissors, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type CatalogProduct } from "@/lib/catalog-data";
import { formatPhp } from "@/lib/utils";

interface ProductQuickViewProps {
  product: CatalogProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProductQuickViewContent({ product }: { product: CatalogProduct }) {
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const currentImage = activeSide === "front" ? product.frontImage : product.backImage;

  return (
    <DialogContent className="max-w-3xl overflow-hidden p-0 sm:max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Visual Perspective Gallery */}
        <div className="bg-muted/40 relative flex flex-col items-center justify-between border-b p-6 md:border-r md:border-b-0">
          {/* Main Stage Image */}
          <div className="bg-background/80 relative aspect-[4/5] w-full overflow-hidden rounded-sm shadow-inner">
            <Image
              src={currentImage}
              alt={`${product.name} - ${activeSide} view`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-all duration-300"
              priority
            />

            {/* Angle Badge */}
            <div className="absolute top-3 left-3">
              <span className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-md">
                {activeSide} View
              </span>
            </div>
          </div>

          {/* Front / Back Toggle Buttons */}
          <div className="mt-4 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveSide("front")}
              className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border-2 transition-all duration-200 ${
                activeSide === "front"
                  ? "border-primary ring-primary/20 scale-105 ring-2"
                  : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={product.frontImage}
                alt="Front thumbnail"
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>

            <button
              type="button"
              onClick={() => setActiveSide("back")}
              className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border-2 transition-all duration-200 ${
                activeSide === "back"
                  ? "border-primary ring-primary/20 scale-105 ring-2"
                  : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={product.backImage}
                alt="Back thumbnail"
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          </div>
        </div>

        {/* Product Specifications & Order CTA */}
        <div className="flex flex-col justify-between p-6 sm:p-8">
          <div>
            <DialogHeader className="text-left">
              <span className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase">
                {product.category}
              </span>
              <DialogTitle className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {product.description}
              </DialogDescription>
            </DialogHeader>

            {/* Spec Checklist */}
            <div className="mt-6 flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <Layers className="text-primary mt-0.5 size-4.5 shrink-0" />
                <div className="text-sm leading-snug">
                  <span className="text-foreground">Fabric & Weight: </span>
                  <span className="text-muted-foreground">{product.fabric}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="text-primary mt-0.5 size-4.5 shrink-0" />
                <div className="text-sm leading-snug">
                  <span className="text-foreground">Print Technology: </span>
                  <span className="text-muted-foreground">{product.printTech}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Scissors className="text-primary mt-0.5 size-4.5 shrink-0" />
                <div className="text-sm leading-snug">
                  <span className="text-foreground">Cut & Fit: </span>
                  <span className="text-muted-foreground">{product.fit}</span>
                </div>
              </div>
            </div>

            {/* Sizes Available */}
            <div className="mt-5">
              <span className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
                Available Sizes
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.sizes.map((sz) => (
                  <span
                    key={sz}
                    className="border-border bg-background text-foreground rounded border px-2.5 py-1 font-mono text-xs font-medium"
                  >
                    {sz}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Actions & Price */}
          <div className="border-border mt-8 flex flex-col gap-4 border-t pt-5">
            <div className="flex flex-col gap-1">
              <span className="text-primary font-sans text-2xl font-normal tracking-tight sm:text-3xl">
                {formatPhp(product.price)}
              </span>
              <p className="text-muted-foreground font-mono text-[11px]">
                Volume discounts apply at 3+ items (up to 30% OFF)
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full rounded-sm font-sans text-base font-medium tracking-wider sm:text-base"
            >
              <Link href={`/order?product=${encodeURIComponent(product.id)}`}>Order</Link>
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {product && <ProductQuickViewContent key={product.id} product={product} />}
    </Dialog>
  );
}
