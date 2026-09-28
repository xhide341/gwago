"use client";

import { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CatalogProduct } from "@/lib/catalog-data";
import { formatPhp } from "@/lib/utils";
import {
  submitPublicOrder,
  type PublicOrderItemInput,
  type PublicOrderResult,
} from "@/actions/public-orders";

interface PublicOrderWizardProps {
  initialProductId?: string;
  catalogProducts: CatalogProduct[];
}

type StepNumber = 1 | 2 | 3 | 4;

interface RosterRow {
  id: string;
  size: string;
  playerName: string;
  playerNumber: string;
  quantity: number;
}

export function PublicOrderWizard({ initialProductId, catalogProducts }: PublicOrderWizardProps) {
  const [isPending, startTransition] = useTransition();

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const found = catalogProducts.find((p) => p.id === initialProductId);
    return found ? found.id : catalogProducts[0]?.id || "";
  });

  const selectedProduct = useMemo(
    () => catalogProducts.find((p) => p.id === selectedProductId) || catalogProducts[0],
    [catalogProducts, selectedProductId],
  );

  // Wizard Step
  const [step, setStep] = useState<StepNumber>(1);

  // Step 1: Specs
  const [teamName, setTeamName] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Step 2: Sizing mode ("simple" or "roster")
  const [sizeMode, setSizeMode] = useState<"simple" | "roster">("simple");

  // Simple sizing breakdown: mapping size -> quantity
  const [simpleQuantities, setSimpleQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (selectedProduct?.sizes) {
      selectedProduct.sizes.forEach((s, idx) => {
        initial[s] = idx === 1 ? 1 : 0; // Default 1 item for size 'S' or first available
      });
    }
    return initial;
  });

  // Roster rows for team orders
  const [rosterRows, setRosterRows] = useState<RosterRow[]>([
    {
      id: "row-1",
      size: selectedProduct?.sizes[1] || selectedProduct?.sizes[0] || "M",
      playerName: "",
      playerNumber: "",
      quantity: 1,
    },
  ]);

  // Step 3: Contact & Delivery
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [socialHandle, setSocialHandle] = useState("");

  // Submission & Results
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<PublicOrderResult | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const orderItems: PublicOrderItemInput[] = useMemo(() => {
    if (!selectedProduct) return [];

    if (sizeMode === "simple") {
      return Object.entries(simpleQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([size, quantity]) => ({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          size,
          quantity,
          unitPrice: selectedProduct.price,
        }));
    } else {
      return rosterRows
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          size: r.size,
          quantity: r.quantity,
          unitPrice: selectedProduct.price,
          playerName: r.playerName.trim() || undefined,
          playerNumber: r.playerNumber.trim() || undefined,
        }));
    }
  }, [selectedProduct, sizeMode, simpleQuantities, rosterRows]);

  // Quantity and price calculations
  const totalQuantity = useMemo(
    () => orderItems.reduce((acc, curr) => acc + curr.quantity, 0),
    [orderItems],
  );

  const discountTier = useMemo(() => {
    if (totalQuantity >= 25) {
      return { rate: 0.3, percent: 30, label: "Volume Discount (30% off 25+ pcs - Best Value):" };
    }
    if (totalQuantity >= 10) {
      return { rate: 0.2, percent: 20, label: "Volume Discount (20% off 10–24 pcs):" };
    }
    if (totalQuantity >= 3) {
      return { rate: 0.15, percent: 15, label: "Volume Discount (15% off 3–9 pcs):" };
    }
    return null;
  }, [totalQuantity]);

  const hasVolumeDiscount = Boolean(discountTier);
  const unitPrice = selectedProduct?.price || 0;
  const discountedUnitPrice = discountTier
    ? Math.round(unitPrice * (1 - discountTier.rate))
    : unitPrice;
  const effectiveUnitPrice = hasVolumeDiscount ? discountedUnitPrice : unitPrice;

  const rawSubtotal = totalQuantity * unitPrice;
  const finalTotal = totalQuantity * effectiveUnitPrice;
  const discountSavings = rawSubtotal - finalTotal;

  // Handlers for simple quantity changes
  const handleSimpleQtyChange = (size: string, delta: number) => {
    setSimpleQuantities((prev) => {
      const current = prev[size] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [size]: updated };
    });
  };

  // Handlers for roster rows
  const addRosterRow = () => {
    const defaultSize = selectedProduct?.sizes[1] || selectedProduct?.sizes[0] || "M";
    setRosterRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        size: defaultSize,
        playerName: "",
        playerNumber: "",
        quantity: 1,
      },
    ]);
  };

  const removeRosterRow = (id: string) => {
    setRosterRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateRosterRow = (id: string, updates: Partial<RosterRow>) => {
    setRosterRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  // Step Validation
  const canProceedFromStep1 = Boolean(selectedProduct);
  const canProceedFromStep2 = totalQuantity > 0;
  const canProceedFromStep3 =
    customerName.trim().length > 0 &&
    (customerPhone.trim().length > 0 || customerEmail.trim().length > 0);

  // Order Submission
  const handleSubmitOrder = () => {
    setErrorMessage(null);

    if (totalQuantity <= 0) {
      setErrorMessage("Please select at least 1 item to proceed with your order.");
      setStep(2);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      setStep(3);
      return;
    }

    if (!customerPhone.trim() && !customerEmail.trim()) {
      setErrorMessage("Please provide either a contact number or email address.");
      setStep(3);
      return;
    }

    startTransition(async () => {
      const result = await submitPublicOrder({
        customerName,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        socialHandle: socialHandle.trim() || undefined,
        teamName: teamName.trim() || undefined,
        customNotes: customNotes.trim() || undefined,
        items: orderItems,
      });

      if (result.success) {
        setOrderResult(result);
      } else {
        setErrorMessage(result.error || "Failed to submit order. Please try again.");
      }
    });
  };

  const handleCopyReference = () => {
    if (!orderResult?.orderReference) return;
    navigator.clipboard.writeText(orderResult.orderReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS / CONFIRMATION VIEW (Step 5)
  // ─────────────────────────────────────────────────────────────
  if (orderResult?.success) {
    const encodedOrderMsg = encodeURIComponent(
      `Hello Gwago Team! I just placed custom order #${orderResult.orderReference} for ${selectedProduct?.name} (${orderResult.itemCount} items). Looking forward to mockup proof coordination!`,
    );

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <Card className="border-border/80 bg-card overflow-hidden shadow-xl">
          {/* Header Banner */}
          <div className="bg-primary/10 border-border/80 border-b p-6 text-center sm:p-8">
            <div className="bg-primary/20 text-primary mx-auto mb-3 flex size-14 items-center justify-center rounded-full">
              <CheckCircle2 className="size-8" />
            </div>
            <Badge
              variant="outline"
              className="text-primary border-primary/30 mb-2 font-mono text-xs tracking-wider uppercase"
            >
              Order Received • Status: Pending Review
            </Badge>
            <h1 className="font-primary text-foreground text-3xl font-black tracking-tight uppercase sm:text-4xl">
              Order Confirmed
            </h1>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Thank you, <span className="text-foreground font-semibold">{customerName}</span>. Your
              custom apparel order has been logged in our system.
            </p>
          </div>

          <CardContent className="space-y-6 p-6 sm:p-8">
            {/* Reference Number Box */}
            <div className="border-primary/30 bg-primary/[0.04] flex flex-col items-center justify-between gap-3 rounded-xl border p-4 sm:flex-row">
              <div>
                <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                  Order Reference Number
                </span>
                <p className="text-primary font-mono text-xl font-bold tracking-wider sm:text-2xl">
                  {orderResult.orderReference}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReference}
                className="gap-1.5 font-mono text-xs"
              >
                {copiedRef ? (
                  <>
                    <Check className="text-primary size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy Ref #
                  </>
                )}
              </Button>
            </div>

            {/* What Happens Next Timeline */}
            <div>
              <h2 className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
                Next Steps in Production
              </h2>
              <div className="mt-3 space-y-3">
                <div className="border-border/60 bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                  <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="text-foreground font-semibold">
                      Design Proof & Mockup Verification
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Our graphic design team will reach out via your phone/email or Messenger to
                      confirm your layout, colors, and player names before printing.
                    </p>
                  </div>
                </div>

                <div className="border-border/60 bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                  <div className="bg-muted-foreground/30 text-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="text-foreground font-semibold">50% Downpayment Confirmation</p>
                    <p className="text-muted-foreground mt-0.5">
                      Once mockups are approved, we will provide payment instructions (GCash, Maya,
                      or Bank Transfer) to schedule production slot.
                    </p>
                  </div>
                </div>

                <div className="border-border/60 bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                  <div className="bg-muted-foreground/30 text-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="text-foreground font-semibold">Sublimation & Assembly</p>
                    <p className="text-muted-foreground mt-0.5">
                      Custom printing, heat press sublimation, laser cutting, and precision seam
                      stitching take approximately 5 to 7 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                asChild
                size="lg"
                className="w-full gap-2 font-sans text-xs font-bold tracking-wider uppercase sm:text-sm"
              >
                <a
                  href={`https://wa.me/?text=${encodedOrderMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  Chat with Gwago on WhatsApp
                </a>
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="flex-1 font-sans text-xs font-semibold tracking-wider uppercase"
                >
                  <Link href="/products">Browse More Products</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="default"
                  className="flex-1 font-sans text-xs font-semibold tracking-wider uppercase"
                >
                  <Link href="/">Return Home</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN WIZARD VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      {/* ── Wizard Progress Bar ── */}
      <nav aria-label="Order Progress" className="mb-6 sm:mb-8">
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, title: "Product & Specs" },
            { num: 2, title: "Roster & Sizes" },
            { num: 3, title: "Contact & Shipping" },
            { num: 4, title: "Review & Submit" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 1) setStep(1);
                if (s.num === 2 && canProceedFromStep1) setStep(2);
                if (s.num === 3 && canProceedFromStep1 && canProceedFromStep2) setStep(3);
                if (
                  s.num === 4 &&
                  canProceedFromStep1 &&
                  canProceedFromStep2 &&
                  canProceedFromStep3
                )
                  setStep(4);
              }}
              className={`flex flex-col items-center gap-1 border-t-2 pt-2 text-center transition-all duration-200 ${
                step === s.num
                  ? "border-primary text-primary font-bold"
                  : step > s.num
                    ? "border-primary/50 text-foreground"
                    : "border-border text-muted-foreground opacity-60 hover:opacity-100"
              }`}
            >
              <span className="font-mono text-[10px] uppercase sm:text-xs">Step 0{s.num}</span>
              <span className="hidden text-xs font-semibold sm:inline sm:text-sm">{s.title}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-6 rounded-lg border p-4 text-xs font-medium sm:text-sm">
          {errorMessage}
        </div>
      )}

      {/* ── Main Layout: Content Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left Column (Step Content) */}
        <div className="lg:col-span-8">
          {/* STEP 1: Product Selection & Design Notes */}
          {step === 1 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold">
                  1. Select Product & Customization
                </CardTitle>
                <CardDescription>
                  Confirm your garment choice and specify any custom branding or team requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Dropdown Selector */}
                <div className="space-y-2">
                  <Label htmlFor="product-select" className="font-mono text-xs uppercase">
                    Select Apparel Model
                  </Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={(val) => {
                      setSelectedProductId(val);
                      // Update default quantities for new product sizes
                      const newProd = catalogProducts.find((p) => p.id === val);
                      if (newProd) {
                        const updated: Record<string, number> = {};
                        newProd.sizes.forEach((s, idx) => {
                          updated[s] = idx === 1 ? 1 : 0;
                        });
                        setSimpleQuantities(updated);
                      }
                    }}
                  >
                    <SelectTrigger id="product-select" className="h-11">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} • {p.priceFormatted} ({p.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Detail Snapshot */}
                {selectedProduct && (
                  <div className="border-border/80 bg-muted/30 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
                    <div className="bg-background relative aspect-square size-24 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={selectedProduct.frontImage}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {selectedProduct.category}
                        </Badge>
                        <span className="text-primary font-mono font-bold">
                          {selectedProduct.priceFormatted} base
                        </span>
                      </div>
                      <h3 className="text-foreground text-sm font-bold">{selectedProduct.name}</h3>
                      <p className="text-muted-foreground line-clamp-2">
                        {selectedProduct.description}
                      </p>
                      <div className="text-muted-foreground flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                        <span>Fabric: {selectedProduct.fabric}</span>
                        <span>•</span>
                        <span>Cut: {selectedProduct.fit}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team / Brand Name */}
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="font-mono text-xs uppercase">
                    Team, Brand, or Organization Name (Optional)
                  </Label>
                  <Input
                    id="team-name"
                    placeholder="e.g., Manila Vipers Basketball, Class of 2026"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    This will appear in front or back chest graphics on your mockups.
                  </p>
                </div>

                {/* Custom Specifications / Design Notes */}
                <div className="space-y-2">
                  <Label htmlFor="custom-notes" className="font-mono text-xs uppercase">
                    Colorway Preferences & Special Design Notes
                  </Label>
                  <Textarea
                    id="custom-notes"
                    placeholder="Describe your color theme (e.g., Royal Blue/Gold), collar preference, sponsor placements, or any custom text..."
                    rows={4}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="resize-y"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Don’t worry about perfection; our designers will exchange proofs with you before
                    production.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedFromStep1}
                    className="gap-2 font-sans text-xs font-bold tracking-wider uppercase"
                  >
                    Continue to Roster & Sizes
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Roster & Quantities */}
          {step === 2 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold">2. Sizes & Roster Quantities</CardTitle>
                <CardDescription>
                  Specify quantities by size. Team orders can optionally attach player names and
                  jersey numbers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sizing Mode Tabs */}
                <div className="border-border bg-muted/40 flex rounded-lg border p-1">
                  <button
                    type="button"
                    onClick={() => setSizeMode("simple")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                      sizeMode === "simple"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="size-3.5" />
                    Quick Size Counters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeMode("roster")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                      sizeMode === "roster"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="size-3.5" />
                    Player Roster Breakdown
                  </button>
                </div>

                {/* MODE A: Simple Size Counters */}
                {sizeMode === "simple" && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs">
                      Use the counters below to select the number of items needed per size:
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {selectedProduct?.sizes.map((size) => {
                        const qty = simpleQuantities[size] || 0;
                        return (
                          <div
                            key={size}
                            className={`flex flex-col items-center justify-between rounded-xl border p-3 transition-colors ${
                              qty > 0
                                ? "border-primary/50 bg-primary/[0.03]"
                                : "border-border bg-card"
                            }`}
                          >
                            <span className="text-foreground font-mono text-sm font-bold">
                              {size}
                            </span>
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-7 rounded-md"
                                onClick={() => handleSimpleQtyChange(size, -1)}
                                disabled={qty <= 0}
                              >
                                <Minus className="size-3" />
                              </Button>
                              <span className="w-6 text-center font-mono text-sm font-bold">
                                {qty}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-7 rounded-md"
                                onClick={() => handleSimpleQtyChange(size, 1)}
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MODE B: Player Roster Rows */}
                {sizeMode === "roster" && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs">
                      Add players to your roster with their designated size, name, and jersey
                      number:
                    </p>
                    <div className="space-y-2">
                      {rosterRows.map((row, index) => (
                        <div
                          key={row.id}
                          className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border p-3"
                        >
                          <span className="text-muted-foreground w-5 font-mono text-xs font-bold">
                            #{index + 1}
                          </span>

                          {/* Size Selector */}
                          <div className="w-24">
                            <Select
                              value={row.size}
                              onValueChange={(val) => updateRosterRow(row.id, { size: val })}
                            >
                              <SelectTrigger className="h-9 font-mono text-xs">
                                <SelectValue placeholder="Size" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedProduct?.sizes.map((sz) => (
                                  <SelectItem key={sz} value={sz} className="font-mono text-xs">
                                    Size {sz}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Player Name */}
                          <div className="min-w-[120px] flex-1">
                            <Input
                              placeholder="Player Name (Optional)"
                              value={row.playerName}
                              onChange={(e) =>
                                updateRosterRow(row.id, { playerName: e.target.value })
                              }
                              className="h-9 text-xs"
                            />
                          </div>

                          {/* Player Number */}
                          <div className="w-20">
                            <Input
                              placeholder="No. (e.g. 23)"
                              value={row.playerNumber}
                              onChange={(e) =>
                                updateRosterRow(row.id, { playerNumber: e.target.value })
                              }
                              className="h-9 font-mono text-xs"
                              maxLength={4}
                            />
                          </div>

                          {/* Quantity Counter */}
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                updateRosterRow(row.id, {
                                  quantity: Math.max(1, row.quantity - 1),
                                })
                              }
                              disabled={row.quantity <= 1}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-5 text-center font-mono text-xs font-bold">
                              {row.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                updateRosterRow(row.id, { quantity: row.quantity + 1 })
                              }
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>

                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive size-8"
                            onClick={() => removeRosterRow(row.id)}
                            disabled={rosterRows.length <= 1}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRosterRow}
                      className="gap-1.5 font-sans text-xs font-semibold"
                    >
                      <Plus className="size-3.5" />
                      Add Player Row
                    </Button>
                  </div>
                )}

                {/* Total Quantity Alert & Step Controls */}
                <div className="border-border flex items-center justify-between border-t pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="gap-1.5 font-sans text-xs font-semibold tracking-wider uppercase"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canProceedFromStep2}
                    className="gap-2 font-sans text-xs font-bold tracking-wider uppercase"
                  >
                    Continue to Contact & Shipping
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Contact & Delivery */}
          {step === 3 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold">3. Contact & Delivery Info</CardTitle>
                <CardDescription>
                  Where should we send your design mockups and ship the finished apparel?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="customer-name" className="font-mono text-xs uppercase">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer-name"
                    placeholder="e.g., Juan Dela Cruz"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone" className="font-mono text-xs uppercase">
                      Mobile / WhatsApp Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customer-phone"
                      placeholder="0917 123 4567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customer-email" className="font-mono text-xs uppercase">
                      Email Address
                    </Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="juan@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="shipping-address" className="font-mono text-xs uppercase">
                    Delivery Address (City / Province)
                  </Label>
                  <Textarea
                    id="shipping-address"
                    placeholder="Street address, Barangay, City/Municipality, Province, Postal Code"
                    rows={3}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="resize-y"
                  />
                </div>

                {/* Social Handle */}
                <div className="space-y-1.5">
                  <Label htmlFor="social-handle" className="font-mono text-xs uppercase">
                    Facebook Name or Instagram Handle (Optional)
                  </Label>
                  <Input
                    id="social-handle"
                    placeholder="e.g. fb.com/juandelacruz or @juandc"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Helps our artists connect with you quickly for artwork sign-off.
                  </p>
                </div>

                <div className="border-border flex items-center justify-between border-t pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="gap-1.5 font-sans text-xs font-semibold tracking-wider uppercase"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!canProceedFromStep3}
                    className="gap-2 font-sans text-xs font-bold tracking-wider uppercase"
                  >
                    Review Order Summary
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Review & Submit */}
          {step === 4 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold">4. Review & Place Order</CardTitle>
                <CardDescription>
                  Please double check your order specifications before submitting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Box: Customer */}
                <div className="border-border bg-card space-y-2 rounded-xl border p-4 text-xs">
                  <div className="border-border/60 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground font-mono font-bold uppercase">
                      Customer & Contact
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <span className="text-foreground font-semibold">{customerName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      <span className="text-foreground font-semibold">{customerPhone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span className="text-foreground font-semibold">{customerEmail || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Social: </span>
                      <span className="text-foreground font-semibold">{socialHandle || "—"}</span>
                    </div>
                    {shippingAddress && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Delivery Address: </span>
                        <span className="text-foreground font-semibold">{shippingAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Box: Garment & Custom Specs */}
                <div className="border-border bg-card space-y-2 rounded-xl border p-4 text-xs">
                  <div className="border-border/60 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground font-mono font-bold uppercase">
                      Apparel & Design Specs
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <span className="text-muted-foreground">Model: </span>
                      <span className="text-foreground font-bold">{selectedProduct?.name}</span>
                    </div>
                    {teamName && (
                      <div>
                        <span className="text-muted-foreground">Team / Brand: </span>
                        <span className="text-foreground font-semibold">{teamName}</span>
                      </div>
                    )}
                    {customNotes && (
                      <div>
                        <span className="text-muted-foreground">Notes: </span>
                        <span className="text-foreground">{customNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Box: Items Breakdown */}
                <div className="border-border bg-card space-y-3 rounded-xl border p-4 text-xs">
                  <div className="border-border/60 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground font-mono font-bold uppercase">
                      Items & Roster ({totalQuantity} total)
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="divide-border/60 divide-y">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-foreground font-mono font-bold">
                            Size {item.size}
                          </span>
                          {(item.playerName || item.playerNumber) && (
                            <span className="text-muted-foreground ml-2">
                              ({item.playerName || "No Name"}{" "}
                              {item.playerNumber ? `#${item.playerNumber}` : ""})
                            </span>
                          )}
                          <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                        </div>
                        <span className="text-foreground font-mono font-semibold">
                          {formatPhp(item.quantity * effectiveUnitPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Submit Action */}
                <div className="border-border flex items-center justify-between border-t pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(3)}
                    disabled={isPending}
                    className="gap-1.5 font-sans text-xs font-semibold tracking-wider uppercase"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </Button>

                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmitOrder}
                    disabled={isPending}
                    className="gap-2 font-sans text-xs font-bold tracking-wider uppercase sm:text-sm"
                  >
                    {isPending ? (
                      <>
                        <RotateCcw className="size-4 animate-spin" />
                        Submitting Order...
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Confirm & Place Order ({formatPhp(finalTotal)})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Live Order Summary Sticky Card */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            <Card className="border-border/80 bg-card/90 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Product Snapshot */}
                {selectedProduct && (
                  <div className="border-border flex items-center gap-3 border-b pb-3">
                    <div className="bg-muted relative aspect-square size-14 shrink-0 overflow-hidden rounded-md">
                      <Image
                        src={selectedProduct.frontImage}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-bold">{selectedProduct.name}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Base: {selectedProduct.priceFormatted} / pc
                      </p>
                    </div>
                  </div>
                )}

                {/* Volume Discount Badge */}
                {hasVolumeDiscount && discountTier ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="size-4 shrink-0" />
                    <div className="text-[11px]">
                      <span className="font-bold">
                        {discountTier.percent}% Volume Discount Applied!
                      </span>
                      <p className="text-emerald-600/80 dark:text-emerald-400/80">
                        {discountTier.label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-border/80 bg-muted/40 text-muted-foreground flex items-center gap-2 rounded-lg border p-2.5">
                    <Tag className="size-4 shrink-0" />
                    <p className="text-[11px]">
                      Add{" "}
                      <span className="text-foreground font-bold">
                        {Math.max(1, 3 - totalQuantity)} more
                      </span>{" "}
                      item{3 - totalQuantity > 1 ? "s" : ""} to unlock{" "}
                      <span className="text-primary font-bold">15% OFF</span>!
                    </p>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-muted-foreground flex justify-between">
                    <span>Total Units:</span>
                    <span className="text-foreground font-mono font-semibold">
                      {totalQuantity} pc/s
                    </span>
                  </div>

                  <div className="text-muted-foreground flex justify-between">
                    <span>Regular Unit Price:</span>
                    <span className="text-foreground font-mono">{formatPhp(unitPrice)}</span>
                  </div>

                  {hasVolumeDiscount && discountTier && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{discountTier.label}</span>
                      <span className="font-mono font-semibold">-{formatPhp(discountSavings)}</span>
                    </div>
                  )}

                  <div className="border-border flex items-baseline justify-between border-t pt-3">
                    <span className="text-foreground font-bold">Estimated Total:</span>
                    <div className="text-right">
                      <span className="text-primary font-mono text-2xl font-black">
                        {formatPhp(finalTotal)}
                      </span>
                      <p className="text-muted-foreground text-[10px]">
                        Downpayment 50% upon proof approval
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assistance Card */}
            <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-xl border p-4 text-xs">
              <p className="text-foreground font-semibold">Need design assistance?</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                You do not need finalized vector files right now. Submit your order request and our
                design team will create your digital mockup for approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
