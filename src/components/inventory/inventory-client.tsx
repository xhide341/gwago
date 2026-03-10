"use client";

import { useState } from "react";
import Image from "next/image";
import {
  updateVariantFromInventory,
  deleteVariantFromInventory,
} from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Package,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

type InventoryItem = {
  id: string;
  variantId: string;
  quantity: number;
  reorderLevel: number;
  lastRestocked: string | null;
  variant: {
    id: string;
    size: string;
    color: string;
    sku: string;
    image: string | null;
    product: {
      id: string;
      name: string;
      category: string;
      image: string | null;
    };
  };
};

export function InventoryClient({ inventory }: { inventory: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [view, setView] = useState<"table" | "grid">("table");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Extract unique categories from inventory
  const categories = Array.from(
    new Set(inventory.map((i) => i.variant.product.category)),
  ).sort();

  // Filter inventory by search, stock status, and category
  const filtered = inventory.filter((item) => {
    const matchSearch =
      item.variant.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.variant.color.toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      categoryFilter === "all" ||
      item.variant.product.category === categoryFilter;

    if (!matchSearch || !matchCategory) return false;

    if (filter === "low")
      return item.quantity <= item.reorderLevel && item.quantity > 0;
    if (filter === "out") return item.quantity === 0;
    return true;
  });

  const lowStockCount = inventory.filter(
    (i) => i.quantity <= i.reorderLevel && i.quantity > 0,
  ).length;
  const outOfStockCount = inventory.filter((i) => i.quantity === 0).length;

  return (
    <div className="space-y-4">
      {/* Alert banners for low/out of stock */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex gap-3">
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {outOfStockCount} out of stock
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              {lowStockCount} low on stock
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
          <Input
            placeholder="Search by product, SKU, or color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600"
          />
        </div>
        {/* Stock status filter */}
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "low" | "out")}
        >
          <SelectTrigger className="w-40 border-zinc-800 bg-zinc-900 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-950">
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 border-zinc-800 bg-zinc-900 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-950">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="ml-auto flex rounded-lg border border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("table")}
            className={`rounded-r-none ${
              view === "table"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("grid")}
            className={`rounded-l-none ${
              view === "grid"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="py-12 text-center text-sm text-zinc-500">
            No inventory items found.
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <TableView items={filtered} />
      ) : (
        <GridView items={filtered} />
      )}
    </div>
  );
}

// ─── Variant Image (falls back to product image) ───
function VariantImage({
  item,
  size = "sm",
}: {
  item: InventoryItem;
  size?: "sm" | "lg";
}) {
  const src = item.variant.image || item.variant.product.image;
  const dim = size === "sm" ? "h-10 w-10" : "h-20 w-20";

  if (!src) {
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-600`}
      >
        <Package className={size === "sm" ? "h-4 w-4" : "h-8 w-8"} />
      </div>
    );
  }

  return (
    <div
      className={`${dim} relative shrink-0 overflow-hidden rounded-md border border-zinc-800`}
    >
      <Image
        src={src}
        alt={`${item.variant.product.name} - ${item.variant.color}`}
        fill
        className="object-cover"
        sizes={size === "sm" ? "40px" : "80px"}
      />
    </div>
  );
}

// ─── Table View ───
function TableView({ items }: { items: InventoryItem[] }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-400">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">SKU</th>
                <th className="pb-3 font-medium">Size</th>
                <th className="pb-3 font-medium">Color</th>
                <th className="pb-3 font-medium">Quantity</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <VariantImage item={item} size="sm" />
                      <span className="text-white">
                        {item.variant.product.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-xs text-zinc-400">
                    {item.variant.sku}
                  </td>
                  <td className="py-3 text-zinc-300">{item.variant.size}</td>
                  <td className="py-3 text-zinc-300">{item.variant.color}</td>
                  <td className="py-3 font-medium text-white">
                    {item.quantity}
                  </td>
                  <td className="py-3">
                    <StockStatusBadge
                      quantity={item.quantity}
                      reorderLevel={item.reorderLevel}
                    />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <EditVariantDialog item={item} />
                      <DeleteVariantButton item={item} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Grid / Bento View ───
function GridView({ items }: { items: InventoryItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const src = item.variant.image || item.variant.product.image;
        const isLow = item.quantity <= item.reorderLevel && item.quantity > 0;
        const isOut = item.quantity === 0;

        // Border color based on stock status
        const borderColor = isOut
          ? "border-red-500/30"
          : isLow
            ? "border-yellow-500/30"
            : "border-zinc-800";

        return (
          <Card
            key={item.id}
            className={`${borderColor} overflow-hidden bg-zinc-900/50 transition-colors hover:border-zinc-600`}
          >
            {/* Image area */}
            <div className="relative aspect-square w-full bg-zinc-950">
              {src ? (
                <Image
                  src={src}
                  alt={`${item.variant.product.name} - ${item.variant.color}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-700">
                  <Package className="h-12 w-12" />
                </div>
              )}
              {/* Status badge overlay */}
              <div className="absolute left-2 top-2">
                <StockStatusBadge
                  quantity={item.quantity}
                  reorderLevel={item.reorderLevel}
                />
              </div>
              {/* Quantity overlay */}
              <div className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
                Qty: {item.quantity}
              </div>
            </div>

            {/* Details */}
            <CardContent className="space-y-2 p-3">
              <div>
                <h3 className="truncate text-sm font-medium text-white">
                  {item.variant.product.name}
                </h3>
                <p className="truncate font-mono text-xs text-zinc-500">
                  {item.variant.sku}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Badge
                  variant="outline"
                  className="border-zinc-700 text-zinc-400"
                >
                  {item.variant.size}
                </Badge>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-600"
                    style={{
                      backgroundColor: getColorHex(item.variant.color),
                    }}
                  />
                  {item.variant.color}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-zinc-500">
                  Reorder at {item.reorderLevel}
                </span>
                <div className="flex items-center gap-1">
                  <EditVariantDialog item={item} />
                  <DeleteVariantButton item={item} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Simple color name to hex mapping for the color dot
function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    black: "#1a1a1a",
    white: "#f5f5f5",
    navy: "#1e3a5f",
    red: "#dc2626",
    "royal blue": "#2563eb",
    maroon: "#7f1d1d",
    gray: "#6b7280",
    grey: "#6b7280",
    blue: "#3b82f6",
    green: "#10b981",
    yellow: "#eab308",
    orange: "#f97316",
    pink: "#ec4899",
    purple: "#8b5cf6",
  };
  return map[colorName.toLowerCase()] || "#6b7280";
}

// ─── Stock Status Badge ───
function StockStatusBadge({
  quantity,
  reorderLevel,
}: {
  quantity: number;
  reorderLevel: number;
}) {
  if (quantity === 0) {
    return (
      <Badge
        variant="outline"
        className="border-red-500/20 bg-red-500/10 text-red-500"
      >
        Out of Stock
      </Badge>
    );
  }
  if (quantity <= reorderLevel) {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
      >
        Low Stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
    >
      In Stock
    </Badge>
  );
}

// ─── Edit Variant Dialog ───
function EditVariantDialog({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(
    item.variant.image || item.variant.product.image || null,
  );
  const [size, setSize] = useState(item.variant.size);
  const [color, setColor] = useState(item.variant.color);
  const [sku, setSku] = useState(item.variant.sku);
  const [quantity, setQuantity] = useState(item.quantity);

  // Reset form when dialog opens
  function handleOpenChange(next: boolean) {
    if (next) {
      setImage(item.variant.image || item.variant.product.image || null);
      setSize(item.variant.size);
      setColor(item.variant.color);
      setSku(item.variant.sku);
      setQuantity(item.quantity);
    }
    setOpen(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateVariantFromInventory(item.variantId, {
        size,
        color,
        sku,
        image,
        quantity,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">
            Edit — {item.variant.product.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Variant Image</Label>
            <ImageUpload
              name="variantImage"
              value={image}
              onChange={setImage}
              className="mx-auto max-w-48"
            />
          </div>

          {/* Size & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-zinc-400">Size</Label>
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="border-zinc-800 bg-zinc-900 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Color</Label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border-zinc-800 bg-zinc-900 text-white"
              />
            </div>
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label className="text-zinc-400">SKU</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="border-zinc-800 bg-zinc-900 font-mono text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Quantity</Label>
            <Input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="border-zinc-800 bg-zinc-900 text-white"
            />
            <p className="text-xs text-zinc-600">
              Reorder level is managed at the product level and applies to all
              variants.
            </p>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black hover:bg-zinc-200"
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Variant Button ───
function DeleteVariantButton({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteVariantFromInventory(item.variantId);
      setOpen(false);
    } catch {
      alert("Cannot delete — this variant is used in existing orders.");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-white">Delete Variant</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-400">
          Are you sure you want to delete{" "}
          <span className="font-medium text-white">
            {item.variant.product.name} — {item.variant.size} /{" "}
            {item.variant.color}
          </span>
          ? This will also remove its inventory stock record. This action cannot
          be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-500"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
