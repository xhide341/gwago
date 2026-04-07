"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductDeleteImpact,
  createVariant,
  updateVariant,
  deleteVariant,
} from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit,
  Loader2,
  ChevronDown,
  ChevronRight,
  Package,
  Search,
  AlertTriangle,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { firstErrorMessage } from "@/lib/form-errors";
import { toast } from "sonner";
import {
  addProductFormSchema,
  addVariantFormSchema,
  editProductFormSchema,
  PRODUCT_CATEGORIES,
} from "@/lib/validation/forms";

type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

function isProductCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  reorderLevel: number;
  image: string | null;
  isActive: boolean;
  variants: {
    id: string;
    image: string | null;
    size: string;
    color: string;
    sku: string;
    priceAdjustment: number;
    stock: { quantity: number; reorderLevel: number } | null;
    _count: { orderItems: number };
  }[];
};

type ProductDeleteImpact = Awaited<ReturnType<typeof getProductDeleteImpact>>;
type ProductView = "active" | "archived" | "all";

export function ProductsClient({ products }: { products: Product[] }) {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ProductView>("active");

  const activeCount = products.filter((product) => product.isActive).length;
  const archivedCount = products.length - activeCount;

  // Filter products by search term
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const matchesView =
      view === "all" || (view === "active" ? p.isActive : !p.isActive);

    return matchesSearch && matchesView;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: search + add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600"
          />
        </div>
        <AddProductDialog />
      </div>
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as ProductView)}
      >
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedCount})</TabsTrigger>
          <TabsTrigger value="all">All ({products.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      {/* Products list */}
      {filtered.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="py-12 text-center text-sm text-zinc-500">
            {products.length === 0
              ? "No products yet. Add your first product to get started."
              : "No products match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => {
            const productOrderItemCount = product.variants.reduce(
              (sum, variant) => sum + variant._count.orderItems,
              0,
            );
            const hasOrderHistory = productOrderItemCount > 0;

            return (
              <Card key={product.id} className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="items-center">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Expand/collapse variants */}
                      <button
                        onClick={() =>
                          setExpandedProduct(
                            expandedProduct === product.id ? null : product.id,
                          )
                        }
                        className="text-zinc-500 hover:text-white"
                      >
                        {expandedProduct === product.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {/* Product thumbnail */}
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-600">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">
                          {product.name}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-zinc-700 text-zinc-400"
                          >
                            {product.category}
                          </Badge>
                          <span className="text-sm text-zinc-500">
                            ₱{product.basePrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-zinc-600">
                            - {product.variants.length} variant
                            {product.variants.length !== 1 ? "s" : ""}
                          </span>
                          {hasOrderHistory && (
                            <Badge
                              variant="outline"
                              className="border-yellow-500/30 text-yellow-400"
                            >
                              In orders: {productOrderItemCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!product.isActive && (
                        <Badge
                          variant="outline"
                          className="border-red-500/20 text-red-500"
                        >
                          Inactive
                        </Badge>
                      )}
                      <EditProductDialog product={product} />
                      <ProductDeleteDialog
                        productId={product.id}
                        productName={product.name}
                        hasOrderHistory={hasOrderHistory}
                      />
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded variants section */}
                {expandedProduct === product.id && (
                  <CardContent className="border-t border-zinc-800 pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-zinc-400">
                          Variants
                        </h4>
                        <AddVariantDialog
                          productId={product.id}
                          productReorderLevel={product.reorderLevel}
                          productBasePrice={product.basePrice}
                        />
                      </div>

                      {product.variants.length === 0 ? (
                        <p className="py-4 text-center text-sm text-zinc-600">
                          No variants yet. Add size/color combinations.
                        </p>
                      ) : (
                        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-zinc-900/50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                                <th className="pb-2 font-medium">Image</th>
                                <th className="pb-2 font-medium">SKU</th>
                                <th className="pb-2 font-medium">Size</th>
                                <th className="pb-2 font-medium">Color</th>
                                <th className="pb-2 font-medium">
                                  Variant Price
                                </th>
                                <th className="pb-2 font-medium">Stock</th>
                                <th className="pb-2 font-medium"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                              {product.variants.map((v) => (
                                <tr key={v.id}>
                                  <td className="py-2">
                                    <div className="relative h-8 w-8 overflow-hidden rounded-md bg-zinc-800">
                                      {v.image ? (
                                        <Image
                                          src={v.image}
                                          alt={`${product.name} ${v.size} ${v.color}`}
                                          fill
                                          sizes="32px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-zinc-600">
                                          <Package className="h-4 w-4" />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 font-mono text-xs text-zinc-400">
                                    <div className="flex items-center gap-2">
                                      <span>{v.sku}</span>
                                      {v._count.orderItems > 0 ? (
                                        <Badge
                                          variant="outline"
                                          className="border-yellow-500/30 text-yellow-400"
                                        >
                                          In orders
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="py-2 text-white">{v.size}</td>
                                  <td className="py-2 text-white">{v.color}</td>
                                  <td className="py-2 text-zinc-400">
                                    PHP{" "}
                                    {(
                                      product.basePrice + v.priceAdjustment
                                    ).toFixed(2)}
                                  </td>
                                  <td className="py-2">
                                    <StockBadge
                                      quantity={v.stock?.quantity ?? 0}
                                      reorderLevel={v.stock?.reorderLevel ?? 10}
                                    />
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center justify-end gap-1">
                                      <EditVariantDialog
                                        variant={v}
                                        productId={product.id}
                                        productBasePrice={product.basePrice}
                                      />
                                      <VariantDeleteDialog
                                        variantId={v.id}
                                        sku={v.sku}
                                        size={v.size}
                                        color={v.color}
                                        linkedOrderItems={v._count.orderItems}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductDeleteDialog({
  productId,
  productName,
  hasOrderHistory,
}: {
  productId: string;
  productName: string;
  hasOrderHistory: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<ProductDeleteImpact | null>(null);
  const [preparingDialog, setPreparingDialog] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const statusCards = [
    { key: "PENDING", label: "Pending", color: "#eab308" },
    { key: "PROCESSING", label: "Processing", color: "#3b82f6" },
  ] as const;

  async function prepareDialog() {
    setPreparingDialog(true);
    setImpact(null);
    setImpactError(null);
    setLoadingImpact(true);

    try {
      const nextImpact = await getProductDeleteImpact(productId);
      setImpact(nextImpact);
    } catch {
      setImpactError("Unable to load product usage summary right now.");
    } finally {
      setLoadingImpact(false);
      setPreparingDialog(false);
      setOpen(true);
    }
  }

  const totalActiveOrders = impact
    ? impact.linkedOrdersByStatus.PENDING +
      impact.linkedOrdersByStatus.PROCESSING
    : 0;

  async function handleConfirm() {
    setSubmitting(true);

    try {
      const result = await deleteProduct(productId);
      if (result.status === "blocked") {
        toast.error(result.message);
        return;
      }
      if (result.status === "archived") {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
      }
      setOpen(false);
    } catch {
      toast.error("Unable to process this action right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const recommendedAction =
    impact?.recommendedAction ?? (hasOrderHistory ? "ARCHIVE" : undefined);
  const isArchiveFlow = recommendedAction === "ARCHIVE";
  const isBlockedFlow = recommendedAction === "BLOCKED";
  const actionLabel = isBlockedFlow
    ? "Blocked by Active Orders"
    : isArchiveFlow
      ? "Archive Product"
      : "Delete Permanently";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Archive or delete product"
        onClick={() => void prepareDialog()}
        disabled={preparingDialog}
        aria-label={
          preparingDialog
            ? "Loading product archive options"
            : "Archive or delete product"
        }
        className="h-8 w-8 text-zinc-500 hover:text-red-400"
      >
        {preparingDialog ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isBlockedFlow
                ? "Product Has Active Orders"
                : isArchiveFlow
                  ? "Archive Product?"
                  : "Confirm Product Removal?"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isBlockedFlow ? (
              <p className="text-sm text-zinc-400">
                <span className="font-medium text-white">{productName}</span> is
                still used by active orders and cannot be archived yet.
              </p>
            ) : isArchiveFlow ? (
              <div className="space-y-5 pt-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-400">
                    You are about to archive:
                  </p>
                  <p className="text-sm font-medium text-white">
                    {productName}
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
                  <p className="text-sm text-yellow-200">
                    This product and all its variants will be hidden from the
                    active catalog.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                Review product usage for{" "}
                <span className="font-medium text-white">{productName}</span>.
              </p>
            )}

            {!isArchiveFlow && loadingImpact ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-sm text-zinc-400">
                Loading product usage summary...
              </div>
            ) : null}

            {!isArchiveFlow && impactError ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                {impactError}
              </div>
            ) : null}

            {!isArchiveFlow && impact ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {statusCards.map(({ key, label, color }) => {
                    const count = impact.linkedOrdersByStatus[key];
                    const percentValue =
                      totalActiveOrders > 0
                        ? (count / totalActiveOrders) * 100
                        : 0;
                    const percentLabel = `${percentValue.toFixed(1)}%`;

                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-400">
                            {label}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: percentLabel,
                              backgroundColor: color,
                            }}
                            role="progressbar"
                            aria-label={`${label} orders`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Number(percentValue.toFixed(1))}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-zinc-500">
                          {percentLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {impact.variants.length > 0 ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        Variants affected
                      </p>
                    </div>
                    <div className="max-h-44 overflow-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-zinc-900/50">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur">
                          <tr className="border-b border-zinc-800 text-left text-zinc-500">
                            <th className="py-1.5 font-medium">SKU</th>
                            <th className="py-1.5 font-medium">Option</th>
                            <th className="py-1.5 font-medium">Stock</th>
                            <th className="py-1.5 font-medium">Order Items</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
                          {impact.variants.map((variant) => (
                            <tr key={variant.id}>
                              <td className="py-1.5 font-mono">
                                {variant.sku}
                              </td>
                              <td className="py-1.5">
                                {variant.size} / {variant.color}
                              </td>
                              <td className="py-1.5">
                                {variant.stockQuantity}
                              </td>
                              <td className="py-1.5">
                                {variant.linkedOrderItems}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {impact.recommendedAction !== "BLOCKED" ? (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      impact.recommendedAction === "ARCHIVE"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    <p>
                      {impact.recommendedAction === "ARCHIVE"
                        ? "This product is linked to historical orders. It will be archived instead of deleted."
                        : "No linked orders found. It can be safely deleted."}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {isBlockedFlow ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                Complete or cancel the active orders first. This product should
                stay active until those operations are finished.
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={
                  isArchiveFlow
                    ? submitting
                    : loadingImpact ||
                      submitting ||
                      !impact ||
                      Boolean(impactError) ||
                      isBlockedFlow
                }
                className={
                  isBlockedFlow
                    ? "bg-zinc-700 text-zinc-300"
                    : isArchiveFlow
                      ? "bg-yellow-500 text-black hover:bg-yellow-400"
                      : "bg-red-600 text-white hover:bg-red-500"
                }
                aria-label={
                  submitting
                    ? isArchiveFlow
                      ? "Archiving product"
                      : "Deleting product"
                    : actionLabel
                }
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  actionLabel
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VariantDeleteDialog({
  variantId,
  sku,
  size,
  color,
  linkedOrderItems,
}: {
  variantId: string;
  sku: string;
  size: string;
  color: string;
  linkedOrderItems: number;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasOrderHistory = linkedOrderItems > 0;

  async function handleDelete() {
    setSubmitting(true);

    try {
      const result = await deleteVariant(variantId);
      if (result.status === "blocked") {
        toast.error(result.message);
        return;
      }
      if (result.status === "archived") {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
      }
      setOpen(false);
    } catch {
      toast.error("Unable to delete this variant right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={hasOrderHistory ? "Archive variant" : "Delete variant"}
          className="h-7 w-7 text-zinc-600 hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">
            {hasOrderHistory ? "Archive Variant" : "Delete Variant"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-zinc-400">
            You are about to delete{" "}
            <span className="font-medium text-white">
              {sku} ({size} / {color})
            </span>
            .
          </p>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">
            <div className="flex items-start gap-2">
              <p>
                {hasOrderHistory
                  ? "This variant has order history. Archiving removes it from active catalog flows while preserving historical order references. If any active orders still reference it, the action will be blocked."
                  : "This permanently removes the variant and also removes its inventory stock record."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            aria-label={
              submitting
                ? hasOrderHistory
                  ? "Archiving variant"
                  : "Deleting variant"
                : hasOrderHistory
                  ? "Archive Variant"
                  : "Delete Variant"
            }
            className={
              hasOrderHistory
                ? "bg-yellow-500 text-black enabled:hover:bg-yellow-400!"
                : "bg-red-600 text-white hover:bg-red-500"
            }
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasOrderHistory ? (
              "Archive Variant"
            ) : (
              "Delete Variant"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Color-coded stock badge component
function StockBadge({
  quantity,
  reorderLevel,
}: {
  quantity: number;
  reorderLevel: number;
}) {
  const isCritical = quantity === 0;
  const isLow = quantity <= reorderLevel;

  return (
    <Badge
      variant="outline"
      className={
        isCritical
          ? "border-red-500/20 text-red-500"
          : isLow
            ? "border-yellow-500/20 text-yellow-500"
            : "border-emerald-500/20 text-emerald-500"
      }
    >
      {quantity} {isCritical ? "(Out)" : isLow ? "(Low)" : ""}
    </Badge>
  );
}

// Format: first letter uppercase, rest lowercase
function formatCategory(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Dialog for adding a new product
function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialValues = {
    selectedCategory: "Jersey" as ProductCategory,
    customCategory: "",
    name: "",
    description: "",
    basePrice: "",
    reorderLevel: "10",
    image: null as string | null,
  };

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: addProductFormSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      const categoryValue =
        value.selectedCategory === "Other"
          ? formatCategory(value.customCategory)
          : value.selectedCategory;

      const formData = new FormData();
      formData.set("name", value.name.trim());
      formData.set("description", value.description.trim());
      formData.set("category", categoryValue);
      formData.set("basePrice", value.basePrice.trim());
      formData.set("reorderLevel", value.reorderLevel.trim());
      formData.set("image", value.image ?? "");

      try {
        await createProduct(formData);
        toast.success("Product created successfully.");
        setOpen(false);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to create product. Please try again.",
        );
      }
    },
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(initialValues);
      setSubmitError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">New Product</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Product Image</Label>
            <form.Field name="image">
              {(field) => (
                <ImageUpload
                  name={field.name}
                  value={field.state.value}
                  onChange={(next) => {
                    setSubmitError(null);
                    field.handleChange(next);
                  }}
                  className="mx-auto max-w-48"
                />
              )}
            </form.Field>
          </div>

          {/* Name */}
          <form.Field
            name="name"
            validators={{ onChange: addProductFormSchema.shape.name }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">Name</Label>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="e.g. Classic Round Neck T-Shirt"
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label className="text-zinc-400">Description</Label>
                <Textarea
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setSubmitError(null);
                    field.handleChange(e.target.value);
                  }}
                  placeholder="Product description..."
                  rows={2}
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>
            )}
          </form.Field>

          {/* Category */}
          <form.Field name="selectedCategory">
            {(field) => (
              <div className="space-y-2">
                <Label className="text-zinc-400">Category</Label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSubmitError(null);
                        field.handleChange(cat);
                        if (cat !== "Other") {
                          form.setFieldValue("customCategory", "");
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        field.state.value === cat
                          ? "border-white bg-white text-black"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {field.state.value === "Other" ? (
                  <form.Field name="customCategory">
                    {(customField) => {
                      const error =
                        customField.state.meta.isTouched &&
                        firstErrorMessage(customField.state.meta.errors);

                      return (
                        <>
                          <Input
                            name={customField.name}
                            value={customField.state.value}
                            onBlur={customField.handleBlur}
                            onChange={(e) => {
                              setSubmitError(null);
                              customField.handleChange(e.target.value);
                            }}
                            placeholder="Enter category name"
                            className="mt-2 border-zinc-800 bg-zinc-900 text-white"
                          />
                          {error ? (
                            <p className="text-xs text-red-400">{error}</p>
                          ) : null}
                        </>
                      );
                    }}
                  </form.Field>
                ) : null}
              </div>
            )}
          </form.Field>

          {/* Base Price */}
          <form.Field
            name="basePrice"
            validators={{
              onChange: addProductFormSchema.shape.basePrice,
            }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">Base Price (PHP)</Label>
                  <Input
                    name={field.name}
                    type="number"
                    step="0.01"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="0.00"
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          <form.Field
            name="reorderLevel"
            validators={{
              onChange: addProductFormSchema.shape.reorderLevel,
            }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    Reorder Level (All Variants)
                  </Label>
                  <Input
                    name={field.name}
                    type="number"
                    min="0"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="10"
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {submitError ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {submitError}
            </p>
          ) : null}

          {/* Submit */}
          <form.Subscribe
            selector={(state) =>
              [
                state.isSubmitting,
                state.values.name,
                state.values.basePrice,
              ] as const
            }
          >
            {([isSubmitting, name, basePrice]) => (
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !basePrice.trim()}
                aria-label={
                  isSubmitting ? "Creating product" : "Create Product"
                }
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Product"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for editing an existing product
function EditProductDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const getInitialValues = () => {
    const selectedCategory = isProductCategory(product.category)
      ? product.category
      : "Other";

    return {
      selectedCategory,
      customCategory: selectedCategory === "Other" ? product.category : "",
      name: product.name,
      description: product.description || "",
      basePrice: product.basePrice.toString(),
      image: product.image,
      isActive: product.isActive,
    };
  };

  const form = useForm({
    defaultValues: getInitialValues(),
    validators: {
      onSubmit: editProductFormSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      const categoryValue =
        value.selectedCategory === "Other"
          ? formatCategory(value.customCategory)
          : value.selectedCategory;

      const formData = new FormData();
      formData.set("name", value.name.trim());
      formData.set("description", value.description.trim());
      formData.set("category", categoryValue);
      formData.set("basePrice", value.basePrice.trim());
      formData.set("isActive", value.isActive.toString());
      formData.set("image", value.image ?? "");

      try {
        await updateProduct(product.id, formData);
        toast.info("Product updated successfully.");
        setOpen(false);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to save product. Please try again.",
        );
      }
    },
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(getInitialValues());
      setSubmitError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-white"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Product</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Active Status */}
          <form.Field name="isActive">
            {(field) => (
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-white">
                    Active Status
                  </Label>
                  <p className="text-xs text-zinc-500">
                    Inactive products are hidden from the store.
                  </p>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(next) => {
                    setSubmitError(null);
                    field.handleChange(next);
                  }}
                />
              </div>
            )}
          </form.Field>

          {/* Image */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Product Image</Label>
            <form.Field name="image">
              {(field) => (
                <ImageUpload
                  name={field.name}
                  value={field.state.value}
                  onChange={(next) => {
                    setSubmitError(null);
                    field.handleChange(next);
                  }}
                  className="mx-auto max-w-48"
                />
              )}
            </form.Field>
          </div>

          {/* Name */}
          <form.Field
            name="name"
            validators={{ onChange: editProductFormSchema.shape.name }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">Name</Label>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="e.g. Classic Round Neck T-Shirt"
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label className="text-zinc-400">Description</Label>
                <Textarea
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setSubmitError(null);
                    field.handleChange(e.target.value);
                  }}
                  placeholder="Product description..."
                  rows={2}
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>
            )}
          </form.Field>

          {/* Category */}
          <form.Field name="selectedCategory">
            {(field) => (
              <div className="space-y-2">
                <Label className="text-zinc-400">Category</Label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSubmitError(null);
                        field.handleChange(cat);
                        if (cat !== "Other") {
                          form.setFieldValue("customCategory", "");
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        field.state.value === cat
                          ? "border-white bg-white text-black"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {field.state.value === "Other" ? (
                  <form.Field name="customCategory">
                    {(customField) => {
                      const error =
                        customField.state.meta.isTouched &&
                        firstErrorMessage(customField.state.meta.errors);

                      return (
                        <>
                          <Input
                            name={customField.name}
                            value={customField.state.value}
                            onBlur={customField.handleBlur}
                            onChange={(e) => {
                              setSubmitError(null);
                              customField.handleChange(e.target.value);
                            }}
                            placeholder="Enter category name"
                            className="mt-2 border-zinc-800 bg-zinc-900 text-white"
                          />
                          {error ? (
                            <p className="text-xs text-red-400">{error}</p>
                          ) : null}
                        </>
                      );
                    }}
                  </form.Field>
                ) : null}
              </div>
            )}
          </form.Field>

          {/* Base Price */}
          <form.Field
            name="basePrice"
            validators={{
              onChange: editProductFormSchema.shape.basePrice,
            }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">Base Price (PHP)</Label>
                  <Input
                    name={field.name}
                    type="number"
                    step="0.01"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="0.00"
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {submitError ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {submitError}
            </p>
          ) : null}

          {/* Submit */}
          <form.Subscribe
            selector={(state) =>
              [
                state.isSubmitting,
                state.values.name,
                state.values.basePrice,
              ] as const
            }
          >
            {([isSubmitting, name, basePrice]) => (
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !basePrice.trim()}
                aria-label={isSubmitting ? "Saving product" : "Save Changes"}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for adding a variant to a product
function AddVariantDialog({
  productId,
  productReorderLevel,
  productBasePrice,
}: {
  productId: string;
  productReorderLevel: number;
  productBasePrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialValues = {
    image: null as string | null,
    size: "",
    color: "",
    sku: "",
    variantPrice: "",
  };

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: addVariantFormSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      const formData = new FormData();
      formData.set("productId", productId);
      formData.set("size", value.size.trim());
      formData.set("color", value.color.trim());
      formData.set("sku", value.sku.trim());
      formData.set("variantPrice", value.variantPrice.trim());
      formData.set("image", value.image ?? "");

      try {
        await createVariant(formData);
        toast.success("Variant added successfully.");
        setOpen(false);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to add variant. Please try again.",
        );
      }
    },
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(initialValues);
      setSubmitError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:text-white"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Variant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">New Variant</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <p className="text-xs text-zinc-500">Fields marked * are required.</p>

          {/* Image */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Variant Image</Label>
            <form.Field name="image">
              {(field) => (
                <ImageUpload
                  name={field.name}
                  value={field.state.value}
                  onChange={(next) => {
                    setSubmitError(null);
                    field.handleChange(next);
                  }}
                  className="mx-auto max-w-48"
                />
              )}
            </form.Field>
          </div>

          {/* Size & Color */}
          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="size"
              validators={{ onChange: addVariantFormSchema.shape.size }}
            >
              {(field) => {
                const error =
                  field.state.meta.isTouched &&
                  firstErrorMessage(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">
                      Size <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        setSubmitError(null);
                        field.handleChange(e.target.value);
                      }}
                      placeholder="e.g. M, L, XL"
                      className="border-zinc-800 bg-zinc-900 text-white"
                    />
                    {error ? (
                      <p className="text-xs text-red-400">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>
            <form.Field
              name="color"
              validators={{ onChange: addVariantFormSchema.shape.color }}
            >
              {(field) => {
                const error =
                  field.state.meta.isTouched &&
                  firstErrorMessage(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">
                      Color <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        setSubmitError(null);
                        field.handleChange(e.target.value);
                      }}
                      placeholder="e.g. Black, White"
                      className="border-zinc-800 bg-zinc-900 text-white"
                    />
                    {error ? (
                      <p className="text-xs text-red-400">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>
          </div>

          {/* SKU */}
          <form.Field
            name="sku"
            validators={{ onChange: addVariantFormSchema.shape.sku }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    SKU <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="e.g. TS-BLK-M"
                    className="border-zinc-800 bg-zinc-900 font-mono text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {/* Variant Price */}
          <form.Field
            name="variantPrice"
            validators={{
              onChange: addVariantFormSchema.shape.variantPrice,
            }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    Variant Price (Optional)
                  </Label>
                  <Input
                    name={field.name}
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder={productBasePrice.toFixed(2)}
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  <p className="text-xs text-zinc-600">
                    Leave blank to use the base price.
                  </p>
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          <p className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
            Low-stock level for this product is{" "}
            <span className="font-semibold text-white">
              {productReorderLevel}
            </span>
            .
          </p>

          {submitError ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {submitError}
            </p>
          ) : null}

          {/* Submit */}
          <form.Subscribe
            selector={(state) =>
              [
                state.isSubmitting,
                state.values.size,
                state.values.color,
                state.values.sku,
              ] as const
            }
          >
            {([isSubmitting, size, color, sku]) => (
              <Button
                type="submit"
                disabled={
                  isSubmitting || !size.trim() || !color.trim() || !sku.trim()
                }
                aria-label={isSubmitting ? "Adding variant" : "Add Variant"}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add Variant"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditVariantDialog({
  variant,
  productId,
  productBasePrice,
}: {
  variant: Product["variants"][number];
  productId: string;
  productBasePrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const getInitialValues = () => ({
    image: variant.image,
    size: variant.size,
    color: variant.color,
    sku: variant.sku,
    variantPrice: (productBasePrice + variant.priceAdjustment).toFixed(2),
  });

  const form = useForm({
    defaultValues: getInitialValues(),
    validators: {
      onSubmit: addVariantFormSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      const formData = new FormData();
      formData.set("productId", productId);
      formData.set("size", value.size.trim());
      formData.set("color", value.color.trim());
      formData.set("sku", value.sku.trim());
      formData.set("variantPrice", value.variantPrice.trim());
      formData.set("image", value.image ?? "");

      try {
        await updateVariant(variant.id, formData);
        toast.info("Variant updated successfully.");
        setOpen(false);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to update variant. Please try again.",
        );
      }
    },
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(getInitialValues());
      setSubmitError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-600 hover:text-white"
          title="Edit variant"
        >
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Variant</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <p className="text-xs text-zinc-500">Fields marked * are required.</p>

          <div className="space-y-2">
            <Label className="text-zinc-400">Variant Image</Label>
            <form.Field name="image">
              {(field) => (
                <ImageUpload
                  name={field.name}
                  value={field.state.value}
                  onChange={(next) => {
                    setSubmitError(null);
                    field.handleChange(next);
                  }}
                  className="mx-auto max-w-48"
                />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="size"
              validators={{ onChange: addVariantFormSchema.shape.size }}
            >
              {(field) => {
                const error =
                  field.state.meta.isTouched &&
                  firstErrorMessage(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">
                      Size <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        setSubmitError(null);
                        field.handleChange(e.target.value);
                      }}
                      placeholder="e.g. M, L, XL"
                      className="border-zinc-800 bg-zinc-900 text-white"
                    />
                    {error ? (
                      <p className="text-xs text-red-400">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>
            <form.Field
              name="color"
              validators={{ onChange: addVariantFormSchema.shape.color }}
            >
              {(field) => {
                const error =
                  field.state.meta.isTouched &&
                  firstErrorMessage(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">
                      Color <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        setSubmitError(null);
                        field.handleChange(e.target.value);
                      }}
                      placeholder="e.g. Black, White"
                      className="border-zinc-800 bg-zinc-900 text-white"
                    />
                    {error ? (
                      <p className="text-xs text-red-400">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>
          </div>

          <form.Field
            name="sku"
            validators={{ onChange: addVariantFormSchema.shape.sku }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    SKU <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="e.g. TS-BLK-M"
                    className="border-zinc-800 bg-zinc-900 font-mono text-white"
                  />
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          <form.Field
            name="variantPrice"
            validators={{
              onChange: addVariantFormSchema.shape.variantPrice,
            }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched &&
                firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    Variant Price (Optional)
                  </Label>
                  <Input
                    name={field.name}
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder={productBasePrice.toFixed(2)}
                    className="border-zinc-800 bg-zinc-900 text-white"
                  />
                  <p className="text-xs text-zinc-600">
                    Leave blank to use the base price.
                  </p>
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {submitError ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {submitError}
            </p>
          ) : null}

          <form.Subscribe
            selector={(state) =>
              [
                state.isSubmitting,
                state.values.size,
                state.values.color,
                state.values.sku,
              ] as const
            }
          >
            {([isSubmitting, size, color, sku]) => (
              <Button
                type="submit"
                disabled={
                  isSubmitting || !size.trim() || !color.trim() || !sku.trim()
                }
                aria-label={isSubmitting ? "Saving variant" : "Save Variant"}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Variant"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
