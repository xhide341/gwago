"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLenis } from "@/components/providers/smooth-scroll-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATALOG_CATEGORIES,
  type CatalogCategorySlug,
  type CatalogProduct,
} from "@/lib/catalog-data";
import {
  submitPublicOrder,
  type PublicOrderItemInput,
  type PublicOrderResult,
} from "@/actions/public-orders";
import { CustomOrderModal } from "@/components/orders/custom-order-modal";
import { formatPhp } from "@/lib/utils";

interface NormalOrderFormProps {
  initialProductId?: string;
  catalogProducts: CatalogProduct[];
  initialCustomOpen?: boolean;
}

const ORDER_FORM_STEPS = [
  { step: 1 as const, label: "Apparels" },
  { step: 2 as const, label: "Customization" },
  { step: 3 as const, label: "Delivery" },
];

interface CustomPlayerItem {
  id: string;
  size: string;
  playerName: string;
  playerNumber: string;
  quantity: number;
}

export interface ApparelGroup {
  id: string;
  productId: string;
  viewSide: "front" | "back";
  teamName: string;
  playerItems: CustomPlayerItem[];
}

function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function NormalOrderForm({
  initialProductId,
  catalogProducts,
  initialCustomOpen = false,
}: NormalOrderFormProps) {
  const [isPending, startTransition] = useTransition();
  const [customModalOpen, setCustomModalOpen] = useState(initialCustomOpen);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Apparel Groups State
  const [groups, setGroups] = useState<ApparelGroup[]>(() => {
    const initialProduct =
      catalogProducts.find((p) => p.id === initialProductId) || catalogProducts[0];
    const initialSize = initialProduct?.sizes[1] || initialProduct?.sizes[0] || "M";
    return [
      {
        id: "group-1",
        productId: initialProduct.id,
        viewSide: "front",
        teamName: "",
        playerItems: [
          {
            id: "item-1",
            size: initialSize,
            playerName: "",
            playerNumber: "",
            quantity: 1,
          },
        ],
      },
    ];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>("group-1");
  const [modalMode, setModalMode] = useState<"change" | "add">("change");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalCategory, setModalCategory] = useState<CatalogCategorySlug>("all");
  const [detailsModalGroupId, setDetailsModalGroupId] = useState<string | null>(null);

  const lenis = useLenis();
  useEffect(() => {
    if (isProductModalOpen || Boolean(detailsModalGroupId)) {
      lenis?.stop();
      return () => {
        lenis?.start();
      };
    }
  }, [isProductModalOpen, detailsModalGroupId, lenis]);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  const activeProduct = useMemo(() => {
    return catalogProducts.find((p) => p.id === activeGroup.productId) || catalogProducts[0];
  }, [catalogProducts, activeGroup.productId]);

  const detailsGroup = useMemo(() => {
    if (!detailsModalGroupId) return null;
    return groups.find((g) => g.id === detailsModalGroupId) || null;
  }, [groups, detailsModalGroupId]);

  const detailsProduct = useMemo(() => {
    if (!detailsGroup) return null;
    return catalogProducts.find((p) => p.id === detailsGroup.productId) || null;
  }, [catalogProducts, detailsGroup]);

  // Filtered products inside the search modal
  const modalFilteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const matchesCategory = modalCategory === "all" || p.categorySlug === modalCategory;
      const q = modalSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [catalogProducts, modalCategory, modalSearchQuery]);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Submission State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<PublicOrderResult | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Pricing & Calculations across all combined apparels
  const totalQuantity = useMemo(() => {
    return groups.reduce(
      (sum, group) =>
        sum + group.playerItems.reduce((gSum, item) => gSum + (item.quantity || 0), 0),
      0,
    );
  }, [groups]);

  const discountTier = useMemo(() => {
    if (totalQuantity >= 25) {
      return { rate: 0.3, label: "Volume Discount (30% off 25+ pcs - Best Value):" };
    }
    if (totalQuantity >= 10) {
      return { rate: 0.2, label: "Volume Discount (20% off 10–24 pcs):" };
    }
    if (totalQuantity >= 3) {
      return { rate: 0.15, label: "Volume Discount (15% off 3–9 pcs):" };
    }
    return null;
  }, [totalQuantity]);

  const hasVolumeDiscount = Boolean(discountTier);

  const groupSummaries = useMemo(() => {
    return groups.map((group) => {
      const product = catalogProducts.find((p) => p.id === group.productId) || catalogProducts[0];
      const count = group.playerItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const rawGroupSubtotal = count * product.price;
      const finalGroupSubtotal = discountTier
        ? count * Math.round(product.price * (1 - discountTier.rate))
        : rawGroupSubtotal;
      return {
        group,
        product,
        count,
        rawGroupSubtotal,
        finalGroupSubtotal,
      };
    });
  }, [groups, catalogProducts, discountTier]);

  const rawSubtotal = useMemo(() => {
    return groupSummaries.reduce((sum, g) => sum + g.rawGroupSubtotal, 0);
  }, [groupSummaries]);

  const finalTotal = useMemo(() => {
    return groupSummaries.reduce((sum, g) => sum + g.finalGroupSubtotal, 0);
  }, [groupSummaries]);

  const discountSavings = rawSubtotal - finalTotal;

  const handleSelectProduct = (product: CatalogProduct) => {
    if (modalMode === "change") {
      // Prevent changing to an apparel already present in another group
      if (groups.some((g) => g.id !== activeGroup.id && g.productId === product.id)) {
        return;
      }
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== activeGroup.id) return g;
          return {
            ...g,
            productId: product.id,
            viewSide: "front",
            playerItems: g.playerItems.map((item) => ({
              ...item,
              size: product.sizes.includes(item.size) ? item.size : product.sizes[0],
            })),
          };
        }),
      );
    } else {
      // "add" mode - prevent duplicate apparel style
      if (groups.some((g) => g.productId === product.id)) {
        return;
      }
      const newGroupId = generateUniqueId("group");
      const defaultSize = product.sizes[1] || product.sizes[0] || "M";
      const newGroup: ApparelGroup = {
        id: newGroupId,
        productId: product.id,
        viewSide: "front",
        teamName: "",
        playerItems: [
          {
            id: generateUniqueId("item"),
            size: defaultSize,
            playerName: "",
            playerNumber: "",
            quantity: 1,
          },
        ],
      };
      setGroups((prev) => [...prev, newGroup]);
      setActiveGroupId(newGroupId);
    }
    setIsProductModalOpen(false);
  };

  const handleAddApparelClick = () => {
    setModalMode("add");
    setModalSearchQuery("");
    setModalCategory("all");
    setIsProductModalOpen(true);
  };

  const handleChangeApparelClick = (groupId?: string) => {
    if (groupId) setActiveGroupId(groupId);
    setModalMode("change");
    setModalSearchQuery("");
    setModalCategory("all");
    setIsProductModalOpen(true);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    setGroups((prev) => {
      const filtered = prev.filter((g) => g.id !== groupId);
      if (activeGroupId === groupId && filtered.length > 0) {
        setActiveGroupId(filtered[0].id);
      }
      return filtered;
    });
  };

  const setGroupViewSide = (groupId: string, side: "front" | "back") => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, viewSide: side } : g)));
  };

  const updateGroupTeamName = (groupId: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, teamName: name } : g)));
  };

  // Handlers for Player Rows per apparel group
  const addPlayerItem = (groupId: string) => {
    const targetGroup = groups.find((g) => g.id === groupId) || activeGroup;
    const targetProd =
      catalogProducts.find((p) => p.id === targetGroup.productId) || catalogProducts[0];
    const defaultSize = targetProd?.sizes[1] || targetProd?.sizes[0] || "M";

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          playerItems: [
            ...g.playerItems,
            {
              id: generateUniqueId("item"),
              size: defaultSize,
              playerName: "",
              playerNumber: "",
              quantity: 1,
            },
          ],
        };
      }),
    );
  };

  const removePlayerItem = (groupId: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          playerItems:
            g.playerItems.length > 1 ? g.playerItems.filter((i) => i.id !== itemId) : g.playerItems,
        };
      }),
    );
  };

  const updatePlayerItem = (
    groupId: string,
    itemId: string,
    updates: Partial<CustomPlayerItem>,
  ) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          playerItems: g.playerItems.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item,
          ),
        };
      }),
    );
  };

  const handleCopyReference = () => {
    if (!orderResult?.orderReference) return;
    navigator.clipboard.writeText(orderResult.orderReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (totalQuantity <= 0) {
      setErrorMessage("Please add at least 1 item to your order.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setErrorMessage("Please fill out all required contact and shipping fields.");
      return;
    }

    // Flatten all groups into PublicOrderItemInput payload
    const orderItemsPayload: PublicOrderItemInput[] = [];

    for (const group of groups) {
      const prod = catalogProducts.find((p) => p.id === group.productId) || catalogProducts[0];
      const effectiveUnitPrice = hasVolumeDiscount ? Math.round(prod.price * 0.7) : prod.price;

      for (const item of group.playerItems) {
        if (item.quantity > 0) {
          orderItemsPayload.push({
            productId: group.productId,
            productName: prod.name,
            size: item.size,
            quantity: item.quantity,
            unitPrice: effectiveUnitPrice,
            playerName: item.playerName.trim() || undefined,
            playerNumber: item.playerNumber.trim() || undefined,
          });
        }
      }
    }

    // Summarize team names across all apparel groups
    const teamNamesList = groups
      .map((g) => {
        const prod = catalogProducts.find((p) => p.id === g.productId);
        return g.teamName.trim() ? `${prod?.name || "Apparel"}: "${g.teamName.trim()}"` : "";
      })
      .filter(Boolean);

    const primaryTeamName = groups
      .map((g) => g.teamName.trim())
      .filter(Boolean)
      .join(" / ");

    const teamSpecsNote =
      teamNamesList.length > 0 ? `Front Brand Names:\n${teamNamesList.join("\n")}` : "";
    const combinedCustomNotes = [customNotes.trim(), teamSpecsNote].filter(Boolean).join("\n\n");

    startTransition(async () => {
      try {
        const result = await submitPublicOrder({
          teamName: primaryTeamName || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          shippingAddress: shippingAddress.trim(),
          customNotes: combinedCustomNotes || undefined,
          items: orderItemsPayload,
        });

        if (result.success) {
          setOrderResult(result);
        } else {
          setErrorMessage(result.error || "Failed to submit order. Please try again.");
        }
      } catch (err) {
        console.error("Error submitting order:", err);
        setErrorMessage("An unexpected error occurred while processing your order.");
      }
    });
  };

  if (orderResult?.success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <Card className="border-border/80 bg-card overflow-hidden shadow-xl">
          <div className="bg-primary/10 p-6 text-center sm:p-8">
            <div className="bg-primary/20 text-primary mx-auto mb-3 flex size-14 items-center justify-center rounded-full">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="font-primary text-foreground text-3xl font-bold tracking-wide uppercase sm:text-4xl">
              Order Submitted
            </h1>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Thank you, <span className="text-foreground font-semibold">{customerName}</span>. Your
              customized apparel order has been recorded.
            </p>
          </div>

          <CardContent className="space-y-6 px-6 sm:px-8">
            {/* Reference Number Box */}
            <div className="bg-primary/[0.04] flex flex-col items-center justify-between gap-3 rounded-md p-4 sm:flex-row">
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
                  <>Copied</>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  variant="default"
                  size="default"
                  className="flex-1 font-sans text-xs font-semibold tracking-wider uppercase"
                >
                  <Link href="/">Back to Home</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="flex-1 font-sans text-xs font-semibold tracking-wider uppercase"
                >
                  <Link href="/products">Browse Products</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100svh-14rem)] w-full max-w-6xl px-4 py-6 sm:py-10 lg:min-h-[max(850px,85svh)]">
      {/* Custom Order Modal */}
      <CustomOrderModal open={customModalOpen} onOpenChange={setCustomModalOpen} />

      {/* Product Selection Modal (Structured List View) */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent
          data-lenis-prevent
          className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden overscroll-contain p-0 sm:max-w-3xl"
          onWheel={(e) => {
            if (productListRef.current) {
              const target = e.target as HTMLElement;
              if (!productListRef.current.contains(target)) {
                productListRef.current.scrollTop += e.deltaY;
              }
            }
          }}
        >
          {/* Pinned Search & Filter Header with forward-wheel scrolling */}
          <div
            className="border-border/60 bg-background sticky top-0 z-10 shrink-0 space-y-3 border-b px-6 pt-6 pb-3"
            onWheel={(e) => {
              if (productListRef.current) {
                productListRef.current.scrollTop += e.deltaY;
              }
            }}
          >
            <DialogHeader className="pr-8 pb-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-normal uppercase sm:text-3xl">
                {modalMode === "add" ? "Add Apparel Style" : "Change Apparel Style"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm font-normal">
                {modalMode === "add"
                  ? "Choose another apparel style to include in this single order."
                  : "Search and pick an apparel model to customize with your roster, names, and numbers."}
              </DialogDescription>
            </DialogHeader>

            {/* Search bar & Category filter tabs */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Search styles, fabrics, or models..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="h-11 pl-10 text-base font-normal"
                  autoFocus
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1">
                {CATALOG_CATEGORIES.map((cat) => {
                  const isActive = modalCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setModalCategory(cat.slug)}
                      aria-pressed={isActive}
                      className={`inline-flex shrink-0 items-center justify-center rounded-full border px-3.5 py-1.5 font-mono text-sm font-normal tracking-wide transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Structured Product List */}
          <div
            ref={productListRef}
            data-lenis-prevent
            tabIndex={-1}
            className="divide-border/60 min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain px-6 py-2 outline-none"
          >
            {modalFilteredProducts.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm font-normal">
                No apparel styles found matching your search.
              </div>
            ) : (
              modalFilteredProducts.map((p) => {
                const isCurrentSelected = modalMode === "change" && p.id === activeProduct.id;
                const isAlreadyInOrder =
                  modalMode === "change"
                    ? groups.some((g) => g.id !== activeGroup.id && g.productId === p.id)
                    : groups.some((g) => g.productId === p.id);
                const isDisabled = isCurrentSelected || isAlreadyInOrder;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isDisabled) handleSelectProduct(p);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-lg p-3 transition-colors ${
                      isAlreadyInOrder
                        ? "bg-muted/20 cursor-not-allowed opacity-50"
                        : isCurrentSelected
                          ? "bg-muted/50 cursor-default"
                          : "hover:bg-muted/40 cursor-pointer"
                    }`}
                  >
                    {/* Thumbnail & Info */}
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="border-border/70 bg-background relative aspect-[3/4] size-16 shrink-0 overflow-hidden rounded-md border">
                        <Image
                          src={p.frontImage}
                          alt={p.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-foreground truncate text-lg leading-snug font-normal">
                          {p.name}
                        </h4>
                        <span className="text-primary mt-0.5 block font-mono text-base font-normal">
                          {formatPhp(p.price)}
                        </span>
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm font-normal">
                          {p.fabric} • {p.fit}
                        </p>
                      </div>
                    </div>

                    {/* Select Action Button */}
                    <div className="shrink-0 pl-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isCurrentSelected ? "default" : "outline"}
                        disabled={isDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDisabled) handleSelectProduct(p);
                        }}
                        className="rounded-sm font-mono text-sm font-normal tracking-wider"
                      >
                        {isAlreadyInOrder
                          ? "Added"
                          : isCurrentSelected
                            ? "Selected"
                            : modalMode === "change"
                              ? "Select"
                              : "Add"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Lightbox Modal */}
      <Dialog open={isImageLightboxOpen} onOpenChange={setIsImageLightboxOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-xl flex-col p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader className="pb-3 text-left">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {activeProduct.category}
              </Badge>
              <span className="text-primary font-mono text-xs font-bold">
                {formatPhp(activeProduct.price)}
              </span>
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight sm:text-xl">
              {activeProduct.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Fullscreen preview • {activeGroup.viewSide === "front" ? "Front Side" : "Back Side"}
            </DialogDescription>
          </DialogHeader>

          <div className="border-border/50 bg-muted/20 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border p-2 sm:p-4">
            <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-lg sm:max-w-sm">
              <Image
                src={
                  activeGroup.viewSide === "front"
                    ? activeProduct.frontImage
                    : activeProduct.backImage
                }
                alt={`${activeProduct.name} ${activeGroup.viewSide}`}
                fill
                sizes="(min-width: 640px) 450px, 90vw"
                className="object-contain object-center transition-all duration-300"
                priority
              />
            </div>

            {/* Front / Back Toggle Controls in Lightbox */}
            <div className="border-border/60 bg-background/90 mt-3 flex items-center justify-center gap-1.5 rounded-lg border p-1 shadow-xs backdrop-blur-md">
              <button
                type="button"
                onClick={() => setGroupViewSide(activeGroup.id, "front")}
                className={`rounded-md px-4 py-1 font-mono text-xs font-semibold uppercase transition-colors ${
                  activeGroup.viewSide === "front"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setGroupViewSide(activeGroup.id, "back")}
                className={`rounded-md px-4 py-1 font-mono text-xs font-semibold uppercase transition-colors ${
                  activeGroup.viewSide === "back"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Back
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Page Header: Title on Left, Custom Order Inquire on Right */}
      <div className="border-border/40 mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-normal sm:text-3xl">
            Order Process
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Team uniforms and custom apparel ordering process.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCustomModalOpen(true)}
          className="h-10 shrink-0 rounded-sm px-3.5 font-sans text-sm font-normal"
        >
          Need a Custom Design?
        </Button>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-6 rounded-md border p-4 text-xs font-medium sm:text-sm">
          {errorMessage}
        </div>
      )}

      {/* Main Form Layout Grid */}
      <form
        onSubmit={handleSubmitOrder}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8"
      >
        {/* Left Column: Focused Step Cards */}
        <div className="space-y-6 lg:col-span-8">
          {/* Constrained Horizontal Stepper */}
          <div className="border-border/80 bg-card/70 rounded-md border p-1 shadow-xs backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-1">
              {ORDER_FORM_STEPS.map(({ step, label }) => {
                const isActive = currentStep === step;
                const isCompleted = currentStep > step;

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      if (step === 3 && totalQuantity <= 0) {
                        setErrorMessage(
                          "Please specify at least 1 roster item before proceeding to delivery.",
                        );
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep(step);
                    }}
                    className={`group flex cursor-pointer items-center justify-center gap-2 rounded-sm px-2.5 py-2 text-center transition-all sm:px-3 sm:py-2.5 ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : isCompleted
                          ? "bg-muted/60 text-foreground hover:bg-muted font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
                    }`}
                  >
                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-primary-foreground text-primary"
                          : isCompleted
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                      }`}
                    >
                      {step}
                    </div>
                    <span className="truncate text-xs font-bold tracking-wider uppercase">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* STEP 1: Apparel Styles */}
          {currentStep === 1 && (
            <Card className="border-border rounded-md">
              <CardHeader className="gap-1 pb-3">
                <CardTitle className="text-lg font-semibold tracking-normal">
                  Apparel Styles
                </CardTitle>
                <CardDescription>
                  Choose and configure the apparel styles to include in this single order.
                </CardDescription>
                <CardAction className="self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddApparelClick}
                    className="hidden gap-1.5 rounded-sm font-sans text-sm font-normal tracking-wide sm:inline-flex"
                  >
                    <Plus className="size-4" />
                    <span>Add Another Style</span>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active Apparel Showcase */}
                <div className="border-border/60 bg-muted/20 flex flex-col gap-5 rounded-md border p-4 sm:flex-row sm:items-start sm:gap-6">
                  {/* Product Image  */}
                  <div className="group border-border/60 bg-muted/40 relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-sm border sm:w-44 md:w-48">
                    <Image
                      src={
                        activeGroup.viewSide === "front"
                          ? activeProduct.frontImage
                          : activeProduct.backImage
                      }
                      alt={`${activeProduct.name} ${activeGroup.viewSide}`}
                      fill
                      sizes="(min-width: 640px) 192px, 100vw"
                      className="object-cover object-center transition-all duration-300"
                    />

                    {/* Fullscreen Preview Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsImageLightboxOpen(true)}
                      className="bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-sm shadow-xs backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                      title="Fullscreen Preview"
                      aria-label="Open fullscreen image preview"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>

                    {/* Front / Back Toggle Controls */}
                    <div className="bg-background/85 absolute inset-x-2.5 bottom-2.5 flex items-center justify-center gap-1 rounded-sm p-1 shadow-xs backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => setGroupViewSide(activeGroup.id, "front")}
                        className={`flex-1 rounded-sm py-1 font-mono text-[10px] font-semibold uppercase transition-colors ${
                          activeGroup.viewSide === "front"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Front
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupViewSide(activeGroup.id, "back")}
                        className={`flex-1 rounded-sm py-1 font-mono text-[10px] font-semibold uppercase transition-colors ${
                          activeGroup.viewSide === "back"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Back
                      </button>
                    </div>
                  </div>

                  {/* Item Details & Metadata */}
                  <div className="flex flex-1 flex-col space-y-3.5">
                    {/* Category, Product Name, and Price (grouped closely) */}
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground font-mono text-sm font-medium tracking-wide">
                          {activeProduct.category}
                        </span>
                        {groups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(activeGroup.id)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer rounded-sm p-1.5 transition-colors focus:outline-hidden"
                            title="Remove style from order"
                            aria-label="Remove style from order"
                          >
                            <Trash2 className="size-5" />
                          </button>
                        )}
                      </div>
                      <h3 className="text-foreground text-xl font-bold sm:text-2xl">
                        {activeProduct.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="text-primary text-2xl font-normal">
                          {formatPhp(activeProduct.price)}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                          / pc
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {activeProduct.description}
                    </p>

                    {/* Sizes and actions for this specific style */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="text-muted-foreground flex flex-col items-start gap-1 font-mono text-xs sm:text-sm">
                        <span className="font-semibold">Available Sizes:</span>
                        <span className="text-foreground font-medium">
                          {activeProduct.sizes.join(", ")}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangeApparelClick(activeGroup.id)}
                        className="gap-1.5 rounded-sm font-sans text-sm font-normal"
                      >
                        <Search className="size-4" />
                        <span>Change Style</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Selected Apparel Items */}
                <div className="space-y-3">
                  <Label className="font-mono text-sm font-semibold tracking-wider">
                    Selected Apparel Items ({groups.length})
                  </Label>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {groups.map((group) => {
                      const prod =
                        catalogProducts.find((p) => p.id === group.productId) || catalogProducts[0];
                      const gCount = group.playerItems.reduce(
                        (sum, item) => sum + (item.quantity || 0),
                        0,
                      );
                      const isCurrent = group.id === activeGroupId;

                      return (
                        <div
                          key={group.id}
                          onClick={() => setActiveGroupId(group.id)}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 transition-all ${
                            isCurrent
                              ? "border-primary bg-primary/[0.04] ring-primary/30 shadow-xs ring-1"
                              : "border-border/70 bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="border-border/60 bg-muted relative aspect-[3/4] size-14 shrink-0 overflow-hidden rounded-sm border">
                              <Image
                                src={prod.frontImage}
                                alt={prod.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-foreground truncate text-sm font-semibold">
                                {prod.name}
                              </h4>
                              <p className="text-muted-foreground mt-0.5 font-mono text-sm">
                                {formatPhp(prod.price)} • {gCount} pc{gCount === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {groups.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveGroup(group.id);
                                }}
                                className="text-muted-foreground hover:text-destructive cursor-pointer rounded-sm p-1 transition-colors focus:outline-hidden"
                                title="Remove style from order"
                                aria-label="Remove style from order"
                              >
                                <Trash2 className="size-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 1 Navigation */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setCurrentStep(2);
                    }}
                    className="h-9 w-full rounded-sm px-4 font-sans text-sm font-semibold sm:w-auto"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Customization & Roster */}
          {currentStep === 2 && (
            <Card className="border-border rounded-md">
              <CardHeader className="gap-1 pb-3">
                <CardTitle className="text-lg font-bold">Customization & Roster</CardTitle>
                <CardDescription>
                  Customize the brand name and individual roster items for each apparel style.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Segmented Selector for Apparels */}
                <div className="bg-muted/30 space-y-2.5 rounded-md p-3 sm:p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-mono font-normal tracking-wide">
                      Select Style to Customize
                    </span>
                    <span className="text-muted-foreground font-mono text-xs tracking-wider sm:text-sm">
                      {groups.length} {groups.length === 1 ? "style" : "styles"} total
                    </span>
                  </div>

                  <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap">
                    {groups.map((group) => {
                      const prod =
                        catalogProducts.find((p) => p.id === group.productId) || catalogProducts[0];
                      const isActive = group.id === activeGroupId;

                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setActiveGroupId(group.id)}
                          className="group text-foreground/85 hover:bg-card hover:text-foreground inline-flex shrink-0 cursor-pointer items-center gap-2.5 rounded-sm border border-none bg-none px-3.5 py-2 font-mono text-sm font-medium shadow-2xs transition-colors"
                        >
                          <span
                            className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isActive ? "bg-primary/10" : "bg-background/50"
                            }`}
                          >
                            {isActive && <span className="bg-primary/75 size-1.5 rounded-full" />}
                          </span>
                          <span className="max-w-[160px] truncate sm:max-w-none">{prod.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unified Active Apparel Customization Container */}
                <div className="bg-muted/40 space-y-4 rounded-md p-4 sm:p-5">
                  {/* Active Apparel Subheader Bar */}
                  <div className="border-border/60 flex justify-between border-b pb-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="border-border/70 bg-background relative size-25 shrink-0 overflow-hidden rounded-md border">
                        <Image
                          src={activeProduct.frontImage}
                          alt={activeProduct.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-col justify-around">
                        <span className="text-muted-foreground font-mono text-base font-medium tracking-wide">
                          {activeProduct.category}
                        </span>
                        <h3 className="text-foreground truncate text-2xl font-semibold tracking-wide">
                          {activeProduct.name}
                        </h3>
                        <p className="text-primary mt-0.5 font-mono text-xl">
                          {formatPhp(activeProduct.price)}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangeApparelClick(activeGroup.id)}
                      className="shrink-0 gap-1.5 rounded-sm font-sans text-[.860rem] font-normal"
                    >
                      <Search className="size-3.5" />
                      <span>Change Style</span>
                    </Button>
                  </div>

                  {/* Front Customization: Brand Name */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`team-name-${activeGroup.id}`}
                      className="font-mono text-base font-semibold tracking-wide"
                    >
                      Brand Name
                    </Label>
                    <p className="text-muted-foreground pb-2 text-sm">
                      Text written for front chest. Leave blank for none.
                    </p>
                    <Input
                      id={`team-name-${activeGroup.id}`}
                      placeholder="e.g. Manila Vipers"
                      value={activeGroup.teamName}
                      onChange={(e) => updateGroupTeamName(activeGroup.id, e.target.value)}
                      className="border-border/50 bg-card/60 focus:bg-card dark:bg-input/30 h-10 text-sm font-medium shadow-2xs sm:text-sm"
                    />
                  </div>

                  {/* Back Customization: Roster Table */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-md font-mono font-semibold tracking-wide">
                        Back Customization
                      </Label>
                      <span className="text-muted-foreground font-mono text-xs">
                        {activeGroup.playerItems.length}{" "}
                        {activeGroup.playerItems.length === 1 ? "line" : "lines"}
                      </span>
                    </div>

                    {/* Column Headers (Desktop) */}
                    <div className="text-muted-foreground hidden items-center gap-2.5 px-0.5 pb-1 font-mono text-[11px] font-medium tracking-wider uppercase sm:flex">
                      <div className="flex flex-1 items-center gap-2">
                        <span className="w-5 text-center">#</span>
                        <span className="w-24">Size</span>
                        <span className="flex-1">Name on Back</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-center">Number</span>
                        <span className="w-24 text-center">Qty</span>
                        <span className="w-8" />
                      </div>
                    </div>

                    {/* Borderless Open Roster Rows */}
                    <div className="space-y-2">
                      {activeGroup.playerItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="group flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2.5"
                        >
                          {/* Left Block: Index, Size, Name */}
                          <div className="flex flex-1 items-center gap-2">
                            <span className="text-muted-foreground w-5 shrink-0 text-center font-mono text-xs font-semibold">
                              {index + 1}
                            </span>

                            {/* Size Selector */}
                            <div className="w-24 shrink-0">
                              <Select
                                value={item.size}
                                onValueChange={(val) =>
                                  updatePlayerItem(activeGroup.id, item.id, { size: val })
                                }
                              >
                                <SelectTrigger className="border-border/50 bg-card/60 focus:bg-card dark:bg-input/30 h-9 font-mono text-xs shadow-2xs">
                                  <SelectValue placeholder="Size" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeProduct.sizes.map((sz) => (
                                    <SelectItem key={sz} value={sz} className="font-mono text-xs">
                                      Size {sz}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Text on Back (Surname / Name) */}
                            <div className="min-w-0 flex-1">
                              <Input
                                placeholder="e.g. SANTOS"
                                value={item.playerName}
                                onChange={(e) =>
                                  updatePlayerItem(activeGroup.id, item.id, {
                                    playerName: e.target.value,
                                  })
                                }
                                className="border-border/50 bg-card/60 focus:bg-card dark:bg-input/30 h-9 text-xs uppercase shadow-2xs"
                              />
                            </div>
                          </div>

                          {/* Right Block: Number, Quantity, Delete */}
                          <div className="flex items-center justify-end gap-2 pl-7 sm:pl-0">
                            {/* Number on Back */}
                            <div className="w-20 shrink-0">
                              <Input
                                placeholder="00"
                                value={item.playerNumber}
                                onChange={(e) =>
                                  updatePlayerItem(activeGroup.id, item.id, {
                                    playerNumber: e.target.value,
                                  })
                                }
                                className="border-border/50 bg-card/60 focus:bg-card dark:bg-input/30 h-9 text-center font-mono text-xs font-bold shadow-2xs"
                                maxLength={4}
                              />
                            </div>

                            {/* Quantity Counter */}
                            <div className="border-border/50 bg-card/60 dark:bg-input/30 flex h-9 w-24 shrink-0 items-center justify-between rounded-md border px-1 shadow-2xs">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground size-7 rounded-sm"
                                onClick={() =>
                                  updatePlayerItem(activeGroup.id, item.id, {
                                    quantity: Math.max(1, item.quantity - 1),
                                  })
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="size-3" />
                              </Button>
                              <span className="w-6 text-center font-mono text-xs font-bold">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground size-7 rounded-sm"
                                onClick={() =>
                                  updatePlayerItem(activeGroup.id, item.id, {
                                    quantity: item.quantity + 1,
                                  })
                                }
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>

                            {/* Delete Row Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                              onClick={() => removePlayerItem(activeGroup.id, item.id)}
                              disabled={activeGroup.playerItems.length <= 1}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Add Item Button */}
                    <button
                      type="button"
                      onClick={() => addPlayerItem(activeGroup.id)}
                      className="border-border/40 bg-background/60 text-muted-foreground hover:text-foreground inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border py-3 font-sans text-xs font-medium shadow-2xs transition-colors"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Item to {activeProduct.name}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setErrorMessage(null);
                      setCurrentStep(1);
                    }}
                    className="h-9 rounded-sm px-4 font-sans text-sm font-medium"
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      if (totalQuantity <= 0) {
                        setErrorMessage(
                          "Please add at least 1 item with quantity > 0 before proceeding to delivery.",
                        );
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep(3);
                    }}
                    className="h-9 rounded-sm px-4 font-sans text-sm font-semibold"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Customer & Shipping Information */}
          {currentStep === 3 && (
            <Card className="border-border rounded-md">
              <CardHeader className="gap-1 pb-3">
                <CardTitle className="text-lg font-bold">Contact & Delivery Details</CardTitle>
                <CardDescription>
                  Where should we send design proofs and deliver the items?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="font-mono text-xs uppercase">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cust-name"
                    placeholder="Juan Dela Cruz"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-phone" className="font-mono text-xs uppercase">
                      Mobile / WhatsApp Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cust-phone"
                      placeholder="0917 123 4567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-10 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cust-email" className="font-mono text-xs uppercase">
                      Email Address (Optional)
                    </Label>
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="juan@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-address" className="font-mono text-xs uppercase">
                    Delivery Address (City / Province) <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-muted-foreground text-[11px]">
                    Please include nearest landmark, subdivision/building name, or courier
                    instructions.
                  </p>
                  <Textarea
                    id="cust-address"
                    placeholder="Street address, Barangay, City/Municipality, Province (e.g., Near City Hall, Beside Jollibee)"
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="resize-y text-xs sm:text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-notes" className="font-mono text-xs uppercase">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="cust-notes"
                    placeholder="Special requests"
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="resize-y text-xs sm:text-sm"
                  />
                </div>

                {/* Step 3 Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setErrorMessage(null);
                      setCurrentStep(2);
                    }}
                    className="h-9 rounded-sm px-4 font-sans text-sm font-medium"
                  >
                    Back
                  </Button>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-9 rounded-sm px-4 font-sans text-sm font-semibold"
                  >
                    {isPending ? (
                      <RotateCcw className="size-4 animate-spin" />
                    ) : (
                      `Place order (${formatPhp(finalTotal)})`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="lg:col-span-4">
          <div className="space-y-6">
            <Card className="border-border/80 bg-card/95 gap-3 rounded-md py-5 shadow-lg backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between px-5 py-0 sm:px-6">
                <CardTitle className="text-foreground font-mono text-lg font-semibold tracking-wider sm:text-lg">
                  Order Summary
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setDetailsModalGroupId(activeGroupId || groups[0]?.id)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer font-mono text-sm font-medium underline-offset-4 hover:underline"
                >
                  View Details
                </button>
              </CardHeader>
              <CardContent className="space-y-3.5 px-5 py-0 sm:px-6 sm:py-0">
                {/* Grouped Breakdown per Apparel Style */}
                <div className="pb-1">
                  <div className="divide-border/40 max-h-96 divide-y overflow-y-auto pr-1">
                    {groupSummaries.map(({ group, product, count, rawGroupSubtotal }) => (
                      <div key={group.id} className="py-3.5 first:pt-0 last:pb-0">
                        {/* Style Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="border-border/70 bg-background relative aspect-[3/4] h-22 w-22 shrink-0 overflow-hidden rounded-md border shadow-2xs">
                              <Image
                                src={product.frontImage}
                                alt={product.name}
                                fill
                                sizes="88px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 self-start">
                              <p className="text-muted-foreground truncate text-sm font-semibold">
                                {product.category}
                              </p>
                              <p className="text-foreground truncate text-base font-normal tracking-wider">
                                {product.name}
                              </p>
                              <p className="text-primary mt-0.5 font-mono text-base">
                                {formatPhp(product.price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Item & Price Breakdown */}
                <div className="border-border/40 space-y-2.5 border-t pt-3.5 text-sm sm:text-sm">
                  <div className="text-muted-foreground flex justify-between">
                    <span>Total Styles:</span>
                    <span className="text-foreground font-mono font-medium">
                      {groups.length} {groups.length === 1 ? "style" : "styles"}
                    </span>
                  </div>

                  <div className="text-muted-foreground flex justify-between">
                    <span>Total Quantity:</span>
                    <span className="text-foreground font-mono font-medium">
                      {totalQuantity} pc/s
                    </span>
                  </div>

                  <div className="text-muted-foreground flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-foreground font-mono">{formatPhp(rawSubtotal)}</span>
                  </div>

                  {hasVolumeDiscount && (
                    <div className="flex justify-between font-normal text-emerald-600 dark:text-emerald-400">
                      <span>Volume Discount (30% off 3+ pcs):</span>
                      <span className="font-mono text-base font-medium">
                        -{formatPhp(discountSavings)}
                      </span>
                    </div>
                  )}

                  {/* Estimated Total */}
                  <div className="border-border/40 flex items-baseline justify-between border-t pt-3">
                    <span className="text-muted-foreground text-sm font-medium">
                      Estimated Total:
                    </span>
                    <span className="text-foreground font-mono text-xl font-normal sm:text-xl">
                      {formatPhp(finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Contextual Stepper / Submit Action Button */}
                {currentStep === 1 && (
                  <Button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setCurrentStep(2);
                    }}
                    className="mt-2 h-10 w-full rounded-sm px-4 font-sans text-sm font-semibold shadow-xs"
                  >
                    Next
                  </Button>
                )}

                {currentStep === 2 && (
                  <Button
                    type="button"
                    onClick={() => {
                      if (totalQuantity <= 0) {
                        setErrorMessage(
                          "Please specify at least 1 item with quantity > 0 before proceeding to delivery.",
                        );
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep(3);
                    }}
                    className="mt-2 h-10 w-full rounded-sm px-4 font-sans text-sm font-semibold shadow-xs"
                  >
                    Next
                  </Button>
                )}

                {currentStep === 3 && (
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="mt-2 h-10 w-full rounded-sm px-4 font-sans text-sm font-semibold shadow-xs"
                  >
                    {isPending ? (
                      <RotateCcw className="size-4 animate-spin" />
                    ) : (
                      `Place order (${formatPhp(finalTotal)})`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Support / Assistance */}
            <div className="flex flex-wrap items-center gap-1.5 px-1 py-1 text-sm">
              <span className="text-foreground font-medium">Need help with your order?</span>
              <a
                href="https://m.me/gwagoclothing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-600 underline-offset-4 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Contact us</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      </form>

      {/* View More Details Modal */}
      <Dialog
        open={Boolean(detailsModalGroupId && detailsGroup && detailsProduct)}
        onOpenChange={(open) => {
          if (!open) setDetailsModalGroupId(null);
        }}
      >
        <DialogContent
          data-lenis-prevent
          className="max-h-[90vh] max-w-lg overflow-hidden p-0 sm:max-w-xl"
        >
          {detailsGroup && detailsProduct && (
            <div className="flex max-h-[90vh] flex-col">
              {/* Style selector tabs if multiple styles */}
              {groups.length > 1 && (
                <div className="border-border/60 bg-muted/40 flex flex-wrap items-center gap-2 border-b px-5 py-3 sm:px-6">
                  <span className="text-muted-foreground mr-1 shrink-0 font-mono text-xs font-semibold uppercase">
                    Style:
                  </span>
                  {groups.map((g, i) => {
                    const prod = catalogProducts.find((p) => p.id === g.productId);
                    const isSelected = g.id === detailsGroup.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setDetailsModalGroupId(g.id)}
                        className={`rounded-full border px-4 py-1.5 font-sans text-sm font-medium transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {prod?.name || `Style ${i + 1}`}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Header */}
              <div className="border-border/60 bg-muted/20 border-b p-5 sm:p-6">
                <DialogHeader className="gap-0 pr-8 text-left">
                  <div className="flex items-start gap-4">
                    <div className="border-border/70 bg-background relative aspect-[3/4] h-28 w-24 shrink-0 overflow-hidden rounded-md border shadow-xs sm:h-32 sm:w-28">
                      <Image
                        src={detailsProduct.frontImage}
                        alt={detailsProduct.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        {detailsProduct.category}
                      </p>
                      <DialogTitle className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                        {detailsProduct.name}
                      </DialogTitle>
                      <p className="text-primary font-mono text-lg font-semibold sm:text-xl">
                        {formatPhp(detailsProduct.price)}
                      </p>
                      {detailsGroup.teamName.trim() ? (
                        <div className="mt-2 flex items-center gap-2 text-sm sm:text-base">
                          <Users className="text-muted-foreground size-4 shrink-0" />
                          <span className="text-muted-foreground font-medium">Brand Name:</span>
                          <span className="text-foreground truncate font-semibold">
                            {detailsGroup.teamName.trim()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-muted-foreground/70 mt-2 flex items-center gap-1.5 text-sm italic">
                          <Users className="size-4 shrink-0" />
                          <span>No brand name specified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Roster Table Content */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-foreground font-mono text-sm font-semibold tracking-wide uppercase">
                    Roster & Sizing
                  </h4>
                  <span className="text-muted-foreground font-mono text-sm font-medium sm:text-sm">
                    {detailsGroup.playerItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}{" "}
                    pcs total
                  </span>
                </div>

                <div className="border-border/60 overflow-hidden rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 border-border/60 text-muted-foreground border-b font-mono text-xs uppercase">
                      <tr>
                        <th className="w-10 px-3 py-2 text-center">#</th>
                        <th className="px-3 py-2">Player Name</th>
                        <th className="w-16 px-3 py-2 text-center">Number</th>
                        <th className="w-16 px-3 py-2 text-center">Size</th>
                        <th className="w-14 px-3 py-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/40 divide-y font-mono text-xs">
                      {detailsGroup.playerItems.map((item, i) => (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="text-muted-foreground px-3 py-2 text-center">{i + 1}</td>
                          <td className="text-foreground px-3 py-2 font-sans font-medium">
                            {item.playerName?.trim() ? (
                              item.playerName.trim()
                            ) : (
                              <span className="text-muted-foreground/60 font-sans italic">—</span>
                            )}
                          </td>
                          <td className="text-foreground px-3 py-2 text-center">
                            {item.playerNumber?.trim() ? (
                              item.playerNumber.trim()
                            ) : (
                              <span className="text-muted-foreground/60 italic">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">{item.size}</td>
                          <td className="text-foreground px-3 py-2 text-right font-medium">
                            {item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
