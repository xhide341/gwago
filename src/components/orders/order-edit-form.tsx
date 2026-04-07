"use client";

import { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  generateUniquePaymentReference,
  updateOrder,
  updateTransactionMethod,
  deleteOrder,
} from "@/actions/orders";
import { printReceiptBrowser } from "@/lib/receipt-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Copy,
  Printer,
  Trash2,
  Minus,
  Plus,
  Loader2,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";

type Order = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  salesChannel: string;
  channelFee: number;
  totalAmount: number;
  netAmount: number;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    variantId: string | null;
    productIdSnapshot: string | null;
    productNameSnapshot: string | null;
    quantity: number;
    unitPrice: number;
    adjustedPrice: number | null;
    subtotal: number;
    variantName: string | null;
    variantSku: string | null;
    variantSize: string | null;
    variantColor: string | null;
    variant: {
      id: string;
      size: string;
      color: string;
      sku: string;
      product: { name: string; image: string | null };
    } | null;
  }[];
  transactions: {
    id: string;
    amount: number;
    type: string;
    method: string;
    reference: string | null;
    createdAt: string;
  }[];
};

type Product = {
  id: string;
  name: string;
  image: string | null;
  basePrice: number;
  category: string;
  variants: {
    id: string;
    size: string;
    color: string;
    sku: string;
    priceAdjustment: number;
    stock: { quantity: number } | null;
  }[];
};

export function OrderEditForm({
  order,
  products,
}: {
  order: Order;
  products: Product[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      for (const variant of product.variants) {
        map.set(variant.id, variant.stock?.quantity ?? 0);
      }
    }
    return map;
  }, [products]);

  // Editable state
  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerEmail, setCustomerEmail] = useState(order.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [status, setStatus] = useState(order.status);
  const [salesChannel, setSalesChannel] = useState(
    order.salesChannel ?? "DIRECT",
  );
  const [channelFee, setChannelFee] = useState(order.channelFee ?? 0);
  const [channelFeeInput, setChannelFeeInput] = useState<string | undefined>(
    undefined,
  );
  const [paymentReference, setPaymentReference] = useState(
    order.transactions[0]?.reference ?? "",
  );
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(
    order.transactions[0]?.method ?? "CASH",
  );
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [items, setItems] = useState<
    {
      id: string;
      variantId: string | null;
      productIdSnapshot: string | null;
      productNameSnapshot: string | null;
      productName: string;
      productImage: string | null;
      size: string;
      color: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      adjustedPrice: number | null;
      adjustedPriceInput?: string;
      stockAvailable: number;
      isVariantMissing: boolean;
    }[]
  >(
    order.items.map((item) => ({
      id: item.id,
      variantId: item.variant?.id ?? item.variantId,
      productIdSnapshot: item.productIdSnapshot,
      productNameSnapshot: item.productNameSnapshot,
      productName:
        item.variant?.product.name ??
        item.productNameSnapshot ??
        "Deleted product",
      productImage: item.variant?.product.image ?? null,
      size: item.variant?.size ?? item.variantSize ?? "Unknown size",
      color: item.variant?.color ?? item.variantColor ?? "Unknown color",
      sku: item.variant?.sku ?? item.variantSku ?? "Deleted variant",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      adjustedPrice: item.adjustedPrice as number | null,
      isVariantMissing: !item.variant,
      stockAvailable:
        item.variant
          ? (stockByVariant.get(item.variant.id) ?? 0) +
            (order.status === "CANCELLED" ? 0 : item.quantity)
          : item.quantity,
    })),
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteCandidateIndex, setDeleteCandidateIndex] = useState<
    number | null
  >(null);
  const [variantSearch, setVariantSearch] = useState("");

  const allVariants = useMemo(() => {
    return products.flatMap((product) =>
      product.variants.map((v) => ({
        variantId: v.id,
        productName: product.name,
        productImage: product.image,
        category: product.category,
        size: v.size,
        color: v.color,
        sku: v.sku,
        unitPrice: product.basePrice + v.priceAdjustment,
        stockAvailable: v.stock?.quantity ?? 0,
      })),
    );
  }, [products]);

  // Filtered variant search results
  const searchResults = useMemo(() => {
    let results = allVariants.filter(
      (v) => !items.some((item) => item.variantId === v.variantId),
    );

    if (variantSearch.trim()) {
      const q = variantSearch.toLowerCase();
      results = results.filter(
        (v) =>
          v.productName.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          v.color.toLowerCase().includes(q) ||
          v.size.toLowerCase().includes(q),
      );
    }

    return results.slice(0, 15); // Show a bit more than 8 now that we show all
  }, [variantSearch, allVariants, items]);

  // Computed totals
  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + item.quantity * (item.adjustedPrice ?? item.unitPrice),
      0,
    );
    const fee = Math.round(channelFee * 100) / 100;
    const netAmount = Math.round((subtotal - fee) * 100) / 100;
    return { subtotal, channelFee: fee, netAmount };
  }, [items, channelFee]);

  const hasMissingVariants = items.some((item) => item.isVariantMissing);

  // Item handlers
  function addVariant(variant: (typeof allVariants)[number]) {
    setItems((prev) => [
      ...prev,
      {
        ...variant,
        id: "", // new item, no id yet
        productIdSnapshot: null,
        productNameSnapshot: variant.productName,
        quantity: 1,
        adjustedPrice: null,
        isVariantMissing: false,
      },
    ]);
    setVariantSearch("");
    setIsAddModalOpen(false);
  }
  function updateItemQty(index: number, delta: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  }

  function updateItemAdjustedPrice(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              adjustedPriceInput: value,
              adjustedPrice: value === "" ? null : parseFloat(value) || 0,
            }
          : item,
      ),
    );
  }

  function handleAdjustedPriceBlur(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              adjustedPriceInput: undefined,
            }
          : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function requestRemoveItem(index: number) {
    setDeleteCandidateIndex(index);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) {
      setDeleteCandidateIndex(null);
    }
  }

  function confirmRemoveItem() {
    if (deleteCandidateIndex === null) return;
    const candidate = items[deleteCandidateIndex];
    removeItem(deleteCandidateIndex);
    setDeleteCandidateIndex(null);
    if (candidate) {
      toast.info(`Removed ${candidate.productName} from this order.`);
    } else {
      toast.info("Item removed from this order.");
    }
  }

  async function handleGenerateReference() {
    setIsGeneratingReference(true);
    try {
      const generatedReference = await generateUniquePaymentReference();
      setPaymentReference(generatedReference);
    } catch (error) {
      console.error(error);
      window.alert("Unable to generate a unique reference number right now.");
    } finally {
      setIsGeneratingReference(false);
    }
  }

  // Save handler
  function handleSave() {
    if (items.length === 0) return;

    startTransition(async () => {
      try {
        await updateOrder(order.id, {
          customerName,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
          salesChannel: salesChannel as
            | "DIRECT"
            | "SHOPEE"
            | "LAZADA"
            | "TIKTOK"
            | "OTHER",
          channelFee,
          status: status as
            | "PENDING"
            | "PROCESSING"
            | "COMPLETED"
            | "CANCELLED",
          paymentReference,
          items: items.map((item) => ({
            id: item.id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            adjustedPrice: item.adjustedPrice,
            productIdSnapshot: item.productIdSnapshot,
            productNameSnapshot: item.productNameSnapshot,
            variantName: `${item.productName} - ${item.size}`,
            variantSku: item.sku,
            variantSize: item.size,
            variantColor: item.color,
          })),
        });
        router.push("/admin/orders");
      } catch (error) {
        console.error(error);
        window.alert(
          error instanceof Error ? error.message : "Unable to save order.",
        );
      }
    });
  }

  async function handlePrintReceipt() {
    if (status !== "COMPLETED") {
      window.alert("Only completed orders can be printed.");
      return;
    }

    setIsPrintingReceipt(true);
    try {
      printReceiptBrowser({
        orderId: order.id,
        createdAt: order.createdAt,
        status: status as "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED",
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        notes: notes || undefined,
        salesChannel,
        paymentMethod:
          order.transactions.length > 0 ? paymentMethod : undefined,
        paymentReference: paymentReference || undefined,
        subtotal: calculations.subtotal,
        channelFee: calculations.channelFee,
        netTotal: calculations.netAmount,
        items: items.map((item) => ({
          name: item.productName,
          variant: `${item.size} / ${item.color}`,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          adjustedPrice: item.adjustedPrice,
          subtotal: item.quantity * (item.adjustedPrice ?? item.unitPrice),
        })),
      });

      // Keep spinner visible briefly to acknowledge click.
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsPrintingReceipt(false);
    }
  }

  async function handleCopyOrderId() {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.info("Order ID copied.");
    } catch {
      toast.error("Unable to copy Order ID.");
    }
  }

  async function handleDeleteOrder() {
    setIsDeletingOrder(true);
    try {
      await deleteOrder(order.id);
      toast.success("Order deleted successfully.");
      setIsDeleteOrderDialogOpen(false);
      router.push("/admin/orders");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to delete this order.",
      );
    } finally {
      setIsDeletingOrder(false);
    }
  }

  function handleCancel() {
    setIsCancelling(true);
    router.push("/admin/orders");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column: Main Content */}
      <div className="space-y-6 lg:col-span-2">
        {/* Customer Info */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">
              Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Email</Label>
              <Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="border-zinc-800 bg-zinc-900 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="border-zinc-800 bg-zinc-900 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Order Items
            </CardTitle>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Products
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Add Products to Order
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="relative mb-4 flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-zinc-500" />
                    <Input
                      value={variantSearch}
                      onChange={(e) => setVariantSearch(e.target.value)}
                      placeholder="Search product, SKU, or color to add..."
                      className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600"
                      autoFocus
                    />
                  </div>

                  {/* Search results dropdown in modal */}
                  {searchResults.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-zinc-900/50">
                      {searchResults.map((v) => (
                        <button
                          key={v.variantId}
                          type="button"
                          onClick={() => addVariant(v)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800 border-b border-zinc-800/50 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {v.productName}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {v.size} / {v.color}
                              <span className="ml-2 font-mono text-zinc-600">
                                {v.sku}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              ₱ {v.unitPrice.toFixed(2)}
                            </p>
                            <p
                              className={`text-xs ${v.stockAvailable > 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {v.stockAvailable} in stock
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : variantSearch.trim() !== "" ? (
                    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
                      No products match your search.
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border flex flex-col items-center justify-center border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
                      <Package className="h-6 w-6 text-zinc-600 mb-2" />
                      Type to search for available products
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasMissingVariants ? (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  This order includes catalog items that were deleted or retired.
                  They remain in the order history, but their line items are now
                  read-only.
                </p>
              </div>
            ) : null}
            {items.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-red-500/30 bg-red-500/5 p-6 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4" />
                No items in this order. Add at least one item before saving.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                          {item.productImage ? (
                            <Image
                              src={item.productImage}
                              alt={item.productName}
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
                        <div className="min-h-10">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">
                              {item.productName}
                            </p>
                            {item.isVariantMissing ? (
                              <Badge
                                variant="outline"
                                className="border-yellow-500/30 text-yellow-300"
                              >
                                Catalog removed
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-sm text-zinc-500">
                            {item.size} / {item.color}
                            <span className="ml-2 font-mono text-xs text-zinc-600">
                              {item.sku}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestRemoveItem(index)}
                        disabled={item.isVariantMissing}
                        className="h-8 w-8 text-zinc-600 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {/* Quantity */}
                      <div className="flex items-center gap-1.5">
                        <span className="mr-1 text-xs text-zinc-500">Qty</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateItemQty(index, -1)}
                          disabled={item.isVariantMissing}
                          className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium text-white">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateItemQty(index, 1)}
                          disabled={item.isVariantMissing}
                          className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Unit price (base - read-only label) */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">
                          Base Price
                        </span>
                        <span className="w-28 text-sm text-zinc-400">
                          ₱{" "}
                          {item.unitPrice.toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Adjusted price */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">
                          Adjusted Price ₱
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={item.isVariantMissing}
                          value={
                            item.adjustedPriceInput ??
                            (item.adjustedPrice !== null
                              ? item.adjustedPrice.toFixed(2)
                              : "")
                          }
                          placeholder={item.unitPrice.toFixed(2)}
                          onChange={(e) =>
                            updateItemAdjustedPrice(index, e.target.value)
                          }
                          onBlur={() => handleAdjustedPriceBlur(index)}
                          className="h-8 w-28 border-zinc-700 bg-zinc-800 text-sm text-white placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Line total */}
                      <div className="ml-auto text-right">
                        <p className="text-xs text-zinc-500">Line total</p>
                        <p className="text-sm font-medium text-white">
                          &#8369;
                          {(
                            item.quantity *
                            (item.adjustedPrice ?? item.unitPrice)
                          ).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {item.adjustedPrice !== null &&
                          item.adjustedPrice < item.unitPrice && (
                            <p className="text-xs text-emerald-400">
                              -&#8369;
                              {(
                                (item.unitPrice - item.adjustedPrice) *
                                item.quantity
                              ).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              discount
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <Dialog
            open={deleteCandidateIndex !== null}
            onOpenChange={handleDeleteDialogChange}
          >
            <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
              <DialogHeader>
                <DialogTitle className="text-white">Remove item?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-zinc-400">
                This will remove{" "}
                {deleteCandidateIndex !== null &&
                items[deleteCandidateIndex] ? (
                  <span className="text-blue-500">
                    {items[deleteCandidateIndex].productName}
                  </span>
                ) : (
                  "this item"
                )}{" "}
                from the order draft.
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDeleteDialogChange(false)}
                  className="border-zinc-700 text-zinc-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmRemoveItem}
                  className="bg-red-600 text-white hover:bg-red-500"
                >
                  Remove Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </div>

      {/* Right Column: Sidebar */}
      <div className="space-y-6">
        {/* Status & Channel */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">
              Order Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Status</Label>
              <RadioGroup
                value={status}
                onValueChange={setStatus}
                className="flex flex-wrap gap-1.5"
              >
                <div>
                  <RadioGroupItem
                    value="PENDING"
                    id="status-pending"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="status-pending"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-yellow-500/50 hover:text-yellow-400 peer-data-[state=checked]:border-yellow-500/50 peer-data-[state=checked]:bg-yellow-500/10 peer-data-[state=checked]:text-yellow-400"
                  >
                    Pending
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="PROCESSING"
                    id="status-processing"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="status-processing"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-blue-500/50 hover:text-blue-400 peer-data-[state=checked]:border-blue-500/50 peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:text-blue-400"
                  >
                    Processing
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="COMPLETED"
                    id="status-completed"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="status-completed"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 peer-data-[state=checked]:border-emerald-500/50 peer-data-[state=checked]:bg-emerald-500/10 peer-data-[state=checked]:text-emerald-400"
                  >
                    Completed
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="CANCELLED"
                    id="status-cancelled"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="status-cancelled"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400 peer-data-[state=checked]:border-red-500/50 peer-data-[state=checked]:bg-red-500/10 peer-data-[state=checked]:text-red-400"
                  >
                    Cancelled
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs text-zinc-500">Sales Channel</Label>
              <RadioGroup
                value={salesChannel}
                onValueChange={setSalesChannel}
                className="flex flex-wrap gap-1.5"
              >
                <div>
                  <RadioGroupItem
                    value="DIRECT"
                    id="channel-direct"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-direct"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 peer-data-[state=checked]:border-white peer-data-[state=checked]:bg-white/10 peer-data-[state=checked]:text-white"
                  >
                    Direct
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="SHOPEE"
                    id="channel-shopee"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-shopee"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-orange-500/50 hover:text-orange-400 peer-data-[state=checked]:border-orange-500/50 peer-data-[state=checked]:bg-orange-500/10 peer-data-[state=checked]:text-orange-400"
                  >
                    Shopee
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="LAZADA"
                    id="channel-lazada"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-lazada"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-blue-500/50 hover:text-blue-400 peer-data-[state=checked]:border-blue-500/50 peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:text-blue-400"
                  >
                    Lazada
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="TIKTOK"
                    id="channel-tiktok"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-tiktok"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-pink-500/50 hover:text-pink-400 peer-data-[state=checked]:border-pink-500/50 peer-data-[state=checked]:bg-pink-500/10 peer-data-[state=checked]:text-pink-400"
                  >
                    TikTok
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="OTHER"
                    id="channel-other"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-other"
                    className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 peer-data-[state=checked]:border-zinc-500/50 peer-data-[state=checked]:bg-zinc-500/10 peer-data-[state=checked]:text-zinc-300"
                  >
                    Other
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {order.transactions.length > 0 && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-zinc-500">Payment Method</Label>
                <RadioGroup
                  defaultValue={order.transactions[0].method}
                  onValueChange={(value) => {
                    setPaymentMethod(value);
                    void updateTransactionMethod(
                      order.transactions[0].id,
                      value as
                        | "CASH"
                        | "GCASH"
                        | "BANK_TRANSFER"
                        | "CREDIT_CARD"
                        | "OTHER",
                    );
                  }}
                  className="flex flex-wrap gap-1.5"
                >
                  <div>
                    <RadioGroupItem
                      value="CASH"
                      id="pay-cash"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="pay-cash"
                      className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 peer-data-[state=checked]:border-emerald-500/50 peer-data-[state=checked]:bg-emerald-500/10 peer-data-[state=checked]:text-emerald-400"
                    >
                      Cash
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="GCASH"
                      id="pay-gcash"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="pay-gcash"
                      className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-blue-500/50 hover:text-blue-400 peer-data-[state=checked]:border-blue-500/50 peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:text-blue-400"
                    >
                      GCash
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="BANK_TRANSFER"
                      id="pay-bank"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="pay-bank"
                      className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-purple-500/50 hover:text-purple-400 peer-data-[state=checked]:border-purple-500/50 peer-data-[state=checked]:bg-purple-500/10 peer-data-[state=checked]:text-purple-400"
                    >
                      Bank Transfer
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="CREDIT_CARD"
                      id="pay-card"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="pay-card"
                      className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-sky-500/50 hover:text-sky-400 peer-data-[state=checked]:border-sky-500/50 peer-data-[state=checked]:bg-sky-500/10 peer-data-[state=checked]:text-sky-400"
                    >
                      Credit Card
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="OTHER"
                      id="pay-other"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="pay-other"
                      className="flex cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 peer-data-[state=checked]:border-zinc-500/50 peer-data-[state=checked]:bg-zinc-500/10 peer-data-[state=checked]:text-zinc-300"
                    >
                      Other
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="pt-2">
              <Separator className="bg-zinc-800" />
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs text-zinc-500">Deduction (₱)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={channelFeeInput ?? channelFee.toFixed(2)}
                onChange={(e) => {
                  setChannelFeeInput(e.target.value);
                  setChannelFee(parseFloat(e.target.value) || 0);
                }}
                onBlur={() => setChannelFeeInput(undefined)}
                placeholder="0.00"
                className="w-full border-zinc-800 bg-zinc-900 text-white"
              />
              <p className="text-xs text-zinc-600">
                Platform fee, shipping deduction, or any other charge
              </p>
            </div>

            {order.transactions.length > 0 && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-zinc-500">
                  Reference Number
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Receipt / transaction reference"
                    className="w-full min-w-0 flex-1 border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateReference}
                    disabled={isGeneratingReference || isPending}
                    className="min-w-24 shrink-0 justify-center border-zinc-700 text-zinc-300 hover:text-white"
                  >
                    {isGeneratingReference ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="gap-0 border-zinc-800 bg-zinc-900/50">
          <CardHeader className="mb-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Order Summary
            </CardTitle>
            <span className="text-xs text-zinc-500">
              {new Date(order.createdAt).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 mb-4">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal ({items.length} items)</span>
                <span>
                  ₱{" "}
                  {calculations.subtotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {calculations.channelFee > 0 && (
                <div className="mt-2 flex justify-between text-red-400">
                  <span>Deduction</span>
                  <span>
                    -₱{" "}
                    {calculations.channelFee.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <Separator className="my-3 bg-zinc-800" />

              <div className="flex justify-between text-sm font-semibold text-white">
                <span>Net Total</span>
                <span>
                  ₱{" "}
                  {calculations.netAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </CardContent>
          <div className="px-6 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void handlePrintReceipt()}
                disabled={
                  isPending || isPrintingReceipt || status !== "COMPLETED"
                }
                className="flex-1 border-zinc-700 text-zinc-300 hover:text-white"
              >
                {isPrintingReceipt ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-2 h-4 w-4" />
                )}
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleCopyOrderId()}
                className="flex-1 border-zinc-700 text-zinc-300 hover:text-white"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Order ID
              </Button>
            </div>
            <p className="mt-2 text-start text-xs text-zinc-500">
              Print is only available for completed orders.
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 mb-3">
          <Button
            onClick={handleSave}
            disabled={
              isPending || isCancelling || isDeletingOrder || items.length === 0
            }
            className="flex-1 bg-white text-black hover:bg-zinc-200 has-[>svg]:px-4"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Save Changes</>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCancelling || isDeletingOrder}
            className="flex-1 border-zinc-700 text-zinc-400 hover:text-white"
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cancel"
            )}
          </Button>
        </div>

        <Dialog
          open={isDeleteOrderDialogOpen}
          onOpenChange={setIsDeleteOrderDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              className="w-full bg-red-600 text-white hover:bg-red-500"
              disabled={isPending || isDeletingOrder || isCancelling}
            >
              {isDeletingOrder ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete this order"
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
            <DialogHeader>
              <DialogTitle className="text-white">
                Delete this order?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-zinc-400">
              This action cannot be undone. The order and its transactions will
              be permanently deleted.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteOrderDialogOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:text-white"
                disabled={isDeletingOrder || isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Cancel"
                )}
              </Button>
              <Button
                onClick={() => void handleDeleteOrder()}
                className="bg-red-600 text-white hover:bg-red-500"
                disabled={isDeletingOrder || isCancelling}
              >
                {isDeletingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete Order"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
