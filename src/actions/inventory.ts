"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getVariantDeleteDecision } from "@/lib/catalog-delete";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// Get full inventory with product and variant info
export async function getInventory() {
  await requireAuth();
  return prisma.inventoryStock.findMany({
    where: {
      variant: {
        isActive: true,
        product: { isActive: true },
      },
    },
    include: {
      variant: {
        include: { product: true },
      },
    },
    orderBy: { variant: { product: { name: "asc" } } },
  });
}

// Get variants with stock below reorder level
export async function getLowStockAlerts() {
  await requireAuth();
  const stocks = await prisma.inventoryStock.findMany({
    where: {
      variant: {
        isActive: true,
        product: { isActive: true },
      },
    },
    include: {
      variant: {
        include: { product: true },
      },
    },
    orderBy: { variant: { product: { name: "asc" } } },
  });

  return stocks.filter((stock) => stock.quantity <= stock.reorderLevel);
}

// Adjust stock quantity for a variant (add or subtract)
export async function adjustStock(variantId: string, adjustment: number) {
  await requireAuth();

  const stock = await prisma.inventoryStock.findUnique({
    where: { variantId },
  });

  if (!stock) throw new Error("Stock record not found");

  const newQuantity = Math.max(0, stock.quantity + adjustment);

  await prisma.inventoryStock.update({
    where: { variantId },
    data: {
      quantity: newQuantity,
      lastRestocked: adjustment > 0 ? new Date() : undefined,
    },
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

// Update variant details + stock from the inventory edit modal
export async function updateVariantFromInventory(
  variantId: string,
  data: {
    size?: string;
    color?: string;
    sku?: string;
    image?: string | null;
    priceAdjustment?: number;
    quantity?: number;
  },
) {
  await requireAuth();

  // Update variant fields
  const { quantity, ...variantData } = data;
  if (Object.keys(variantData).length > 0) {
    await prisma.variant.update({
      where: { id: variantId },
      data: variantData,
    });
  }

  // Update stock quantity only. Reorder level is controlled at the product level.
  if (quantity !== undefined) {
    await prisma.inventoryStock.update({
      where: { variantId },
      data: {
        ...(quantity !== undefined ? { quantity: Math.max(0, quantity) } : {}),
        ...(quantity !== undefined && quantity > 0
          ? { lastRestocked: new Date() }
          : {}),
      },
    });
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

// Delete a variant and its inventory stock
export async function deleteVariantFromInventory(variantId: string): Promise<{
  status: "deleted" | "archived" | "blocked";
  message: string;
}> {
  await requireAuth();

  const decision = await getVariantDeleteDecision(variantId);

  if (decision.status === "blocked") {
    return {
      status: "blocked",
      message: decision.message,
    };
  }

  if (decision.status === "archived") {
    await prisma.variant.update({
      where: { id: variantId },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidatePath("/admin/archived");
    revalidatePath("/admin");

    return {
      status: "archived",
      message: decision.message,
    };
  }

  try {
    await prisma.variant.delete({ where: { id: variantId } });
  } catch {
    const retryDecision = await getVariantDeleteDecision(variantId);

    if (retryDecision.status === "archived") {
      await prisma.variant.update({
        where: { id: variantId },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
      });

      revalidatePath("/admin/inventory");
      revalidatePath("/admin/products");
      revalidatePath("/admin/archived");
      revalidatePath("/admin");
      return {
        status: "archived",
        message:
          "This variant became historically referenced while deleting, so it was archived instead.",
      };
    }

    if (retryDecision.status === "blocked") {
      return {
        status: "blocked",
        message: retryDecision.message,
      };
    }

    throw new Error("Unable to delete this variant right now.");
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/archived");
  revalidatePath("/admin");

  return {
    status: "deleted",
    message: "Variant deleted.",
  };
}

// Get low stock count for dashboard
export async function getLowStockCount() {
  await requireAuth();

  const stocks = await prisma.inventoryStock.findMany({
    where: {
      variant: {
        isActive: true,
        product: { isActive: true },
      },
    },
    select: {
      quantity: true,
      reorderLevel: true,
    },
  });

  return stocks.reduce(
    (count, stock) => count + (stock.quantity <= stock.reorderLevel ? 1 : 0),
    0,
  );
}
