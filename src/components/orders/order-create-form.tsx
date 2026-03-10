"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder, generateUniquePaymentReference } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Save,
  Trash2,
  Minus,
  Plus,
  Loader2,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";

// ─── Types ───
type Product = {
  id: string;
  name: string;
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

type OrderItem = {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  adjustedPrice: number | null;
  adjustedPriceInput?: string;
  stockAvailable: number;
};

// ─── Component ───
export function OrderCreateForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Order settings
  const [salesChannel, setSalesChannel] = useState("DIRECT");
  const [channelFee, setChannelFee] = useState(0);
  const [channelFeeInput, setChannelFeeInput] = useState<string | undefined>(
    undefined,
  );
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);

  // Items
  const [items, setItems] = useState<OrderItem[]>([]);

  // Variant search
  const [variantSearch, setVariantSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Build flat list of available variants
  const allVariants = useMemo(() => {
    return products.flatMap((product) =>
      product.variants.map((v) => ({
        variantId: v.id,
        productName: product.name,
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

    return results.slice(0, 15);
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

  // ─── Handlers ───
  function addVariant(variant: (typeof allVariants)[number]) {
    setItems((prev) => [
      ...prev,
      {
        ...variant,
        quantity: 1,
        adjustedPrice: null,
      },
    ]);
    setVariantSearch("");
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

  function handleSubmit() {
    if (!customerName.trim() || items.length === 0) return;

    startTransition(async () => {
      try {
        await createOrder({
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
          paymentMethod: paymentMethod as
            | "CASH"
            | "GCASH"
            | "BANK_TRANSFER"
            | "CREDIT_CARD"
            | "OTHER",
          paymentReference,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            adjustedPrice: item.adjustedPrice,
          })),
        });

        router.push("/admin/orders");
      } catch (error) {
        console.error(error);
        window.alert(
          error instanceof Error ? error.message : "Unable to create order.",
        );
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ─── Left Column ─── */}
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
                <Label className="text-xs text-zinc-500">Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Email</Label>
              <Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Order notes..."
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Items */}
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
                              ₱{v.unitPrice.toFixed(2)}
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
            {/* Item list */}
            {items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 p-8 text-sm text-zinc-500">
                <Package className="h-4 w-4" />
                Search and add products to this order
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.variantId}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">
                          {item.productName}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {item.size} / {item.color}
                          <span className="ml-2 font-mono text-xs text-zinc-600">
                            {item.sku}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
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
                          className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        {item.quantity > item.stockAvailable && (
                          <span className="ml-1 text-xs text-red-400">
                            <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                            Only {item.stockAvailable} in stock
                          </span>
                        )}
                      </div>

                      {/* Base price */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">
                          Base Price ₱
                        </span>
                        <span className="w-28 text-sm text-zinc-400">
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
        </Card>
      </div>

      {/* ─── Right Column: Sidebar ─── */}
      <div className="space-y-6">
        {/* Order Settings */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">
              Order Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2 pt-1">
              <Label className="text-xs text-zinc-500">Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
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

            <div className="pt-2">
              <Separator className="bg-zinc-800" />
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs text-zinc-500">Reference Number</Label>
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
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal ({items.length} items)</span>
              <span>
                &#8369;
                {calculations.subtotal.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {calculations.channelFee > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Deduction</span>
                <span>
                  -&#8369;
                  {calculations.channelFee.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            <Separator className="bg-zinc-800" />

            <div className="flex justify-between text-base font-semibold text-white">
              <span>Net Total</span>
              <span>
                &#8369;
                {calculations.netAmount.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {calculations.channelFee > 0 && (
              <p className="rounded-md bg-zinc-800/50 p-2 text-xs text-zinc-500">
                You receive{" "}
                <span className="font-medium text-emerald-400">
                  &#8369;
                  {calculations.netAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>{" "}
                after &#8369;
                {calculations.channelFee.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}{" "}
                deduction
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isPending || items.length === 0 || !customerName.trim()}
            className="flex-1 bg-white text-black hover:bg-zinc-200"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              <>Create Order</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/orders")}
            className="flex-1 border-zinc-700 text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
