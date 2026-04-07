"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { restoreProduct, permanentlyDeleteProduct } from "@/actions/products";

// ─── Types ───────────────────────────────────────────────────────────────────

type Variant = {
  id: string;
  size: string;
  color: string;
  sku: string;
  isActive: boolean;
  image: string | null;
  _count: { orderItems: number };
};

type ArchivedProduct = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  basePrice: number;
  updatedAt: string;
  variants: Variant[];
  totalOrderRefs: number;
  canDelete: boolean;
};

type ArchivedVariant = {
  id: string;
  size: string;
  color: string;
  sku: string;
  image: string | null;
  archivedAt: string | null;
  updatedAt: string;
  _count: { orderItems: number };
  product: {
    id: string;
    name: string;
    category: string;
  };
};

type Props = {
  products: ArchivedProduct[];
  variants: ArchivedVariant[];
};

// ─── Delete eligibility badge ─────────────────────────────────────────────────

function EligibilityBadge({
  canDelete,
  label,
}: {
  canDelete: boolean;
  label?: string;
}) {
  if (canDelete) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-800 bg-emerald-950/60 text-emerald-400"
      >
        <CheckCircle2 className="h-3 w-3" />
        {label ?? "Safe to Delete"}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-red-900 bg-red-950/60 text-red-400"
    >
      <AlertTriangle className="h-3 w-3" />
      {label ?? "Retained for History"}
    </Badge>
  );
}

// ─── Single product card ──────────────────────────────────────────────────────

function ProductCard({ product }: { product: ArchivedProduct }) {
  const [expanded, setExpanded] = useState(false);
  const [restorePending, startRestore] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function handleRestore() {
    startRestore(async () => {
      try {
        const result = await restoreProduct(product.id);
        toast.success(result.message);
      } catch {
        toast.error("Failed to restore product.");
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        const result = await permanentlyDeleteProduct(product.id);
        if (result.status === "deleted") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Failed to delete product.");
      }
    });
  }

  const isLoading = restorePending || deletePending;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
      {/* Product header row */}
      <div className="flex items-start gap-4 p-4">
        {/* Thumbnail */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="h-6 w-6 text-zinc-600" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{product.name}</p>
            <EligibilityBadge canDelete={product.canDelete} />
          </div>
          <p className="text-xs text-zinc-500">
            {product.category} · ₱
            {product.basePrice.toLocaleString("en-PH", {
              minimumFractionDigits: 0,
            })}{" "}
            base · {product.variants.length} variant
            {product.variants.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-zinc-600">
            Archived{" "}
            {format(new Date(product.updatedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Restore button */}
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={handleRestore}
            className="min-w-[82px] justify-center gap-1.5 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            {restorePending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </>
            )}
          </Button>

          {/* Permanent delete — gated by AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!product.canDelete || isLoading}
                className="min-w-[76px] justify-center gap-1.5 border-zinc-700 text-red-400 hover:border-red-800 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-40"
              >
                {deletePending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </>
                )}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete product?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  This will permanently delete{" "}
                  <span className="font-medium text-white">{product.name}</span>{" "}
                  and all its variants. This action{" "}
                  <span className="text-red-400">cannot be undone</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-700 text-white hover:bg-red-600"
                >
                  Yes, delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Expand variants toggle */}
          {product.variants.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
              className="gap-1 text-zinc-500 hover:text-zinc-300"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="text-xs">Variants</span>
            </Button>
          )}
        </div>
      </div>

      {/* Variant rows (collapsible) */}
      {expanded && product.variants.length > 0 && (
        <div className="border-t border-zinc-800">
          <div className="divide-y divide-zinc-800/60">
            {product.variants.map((v) => {
              const variantCanDelete = v._count.orderItems === 0;
              return (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Colour swatch placeholder */}
                  <div className="h-2 w-2 shrink-0 rounded-full bg-zinc-600" />

                  <span className="font-mono text-xs text-zinc-400">
                    {v.sku}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {v.size}
                    {v.color ? ` · ${v.color}` : ""}
                  </span>

                  <div className="ml-auto">
                    <EligibilityBadge
                      canDelete={variantCanDelete}
                      label={
                        variantCanDelete
                          ? "Can Delete"
                          : `${v._count.orderItems} order ref${v._count.orderItems !== 1 ? "s" : ""}`
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main client component ─────────────────────────────────────────────────────

export function ArchivedClient({ products, variants }: Props) {
  if (products.length === 0 && variants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
        <Archive className="mb-3 h-10 w-10 text-zinc-700" />
        <p className="text-sm font-medium text-zinc-400">No archived items</p>
        <p className="mt-1 text-xs text-zinc-600">
          Products that are deactivated will appear here.
        </p>
      </div>
    );
  }

  const deletable = products.filter((p) => p.canDelete).length;
  const retained = products.length - deletable;
  const archivedVariantRefs = variants.filter(
    (variant) => variant._count.orderItems > 0,
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span>
          <span className="font-medium text-zinc-300">{products.length}</span>{" "}
          archived product{products.length !== 1 ? "s" : ""}
        </span>
        {deletable > 0 && (
          <span className="text-emerald-500">· {deletable} safe to delete</span>
        )}
        {retained > 0 && (
          <span className="text-red-400">
            · {retained} retained for order history
          </span>
        )}
        {variants.length > 0 && (
          <span>
            ·{" "}
            <span className="font-medium text-zinc-300">{variants.length}</span>{" "}
            archived variant{variants.length !== 1 ? "s" : ""}
          </span>
        )}
        {archivedVariantRefs > 0 && (
          <span className="text-yellow-400">
            · {archivedVariantRefs} with order history
          </span>
        )}
      </div>

      {/* Product cards */}
      {products.length > 0 ? (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : null}

      {/* Variant-only archives (variant archived while product remains active) */}
      {variants.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-medium text-white">Archived Variants</p>
            <p className="text-xs text-zinc-500">
              Variants archived while their parent product is still active.
            </p>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="font-mono text-xs text-zinc-400">
                  {variant.sku}
                </span>
                <span className="text-sm text-white">
                  {variant.product.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {variant.size}
                  {variant.color ? ` · ${variant.color}` : ""}
                </span>
                <span className="text-xs text-zinc-600">
                  Archived{" "}
                  {format(
                    new Date(variant.archivedAt ?? variant.updatedAt),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </span>
                <div className="ml-auto">
                  <EligibilityBadge
                    canDelete={variant._count.orderItems === 0}
                    label={
                      variant._count.orderItems === 0
                        ? "Can Delete"
                        : `${variant._count.orderItems} order ref${variant._count.orderItems !== 1 ? "s" : ""}`
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
