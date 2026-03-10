"use server";

import { auth } from "@/lib/auth";
import { prisma, Prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Auth guard helper ───
async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// Get all products with variant count
export async function getProducts() {
  await requireAuth();
  return prisma.product.findMany({
    include: {
      variants: {
        include: {
          stock: true,
          _count: { select: { orderItems: true } },
        },
      },
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductDeleteImpact(id: string) {
  await requireAuth();

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isActive: true,
      variants: {
        select: {
          id: true,
          size: true,
          color: true,
          sku: true,
          stock: {
            select: {
              quantity: true,
            },
          },
          _count: { select: { orderItems: true } },
        },
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const whereByProduct = {
    items: {
      some: {
        variant: {
          productId: id,
        },
      },
    },
  } as const;

  const [
    linkedOrderItems,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
  ] = await Promise.all([
    prisma.orderItem.count({
      where: {
        variant: { productId: id },
      },
    }),
    prisma.order.count({
      where: {
        ...whereByProduct,
        status: "PENDING",
      },
    }),
    prisma.order.count({
      where: {
        ...whereByProduct,
        status: "PROCESSING",
      },
    }),
    prisma.order.count({
      where: {
        ...whereByProduct,
        status: "COMPLETED",
      },
    }),
    prisma.order.count({
      where: {
        ...whereByProduct,
        status: "CANCELLED",
      },
    }),
  ]);

  const stockRecords = product.variants.filter((variant) => Boolean(variant.stock))
    .length;

  return {
    product: {
      id: product.id,
      name: product.name,
      isActive: product.isActive,
    },
    variantCount: product.variants.length,
    stockRecordCount: stockRecords,
    linkedOrderItems,
    linkedOrdersByStatus: {
      PENDING: pendingOrders,
      PROCESSING: processingOrders,
      COMPLETED: completedOrders,
      CANCELLED: cancelledOrders,
    },
    canDeletePermanently: linkedOrderItems === 0,
    recommendedAction: linkedOrderItems === 0 ? "DELETE" : "ARCHIVE",
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      stockQuantity: variant.stock?.quantity ?? 0,
      linkedOrderItems: variant._count.orderItems,
    })),
  };
}

// Create a new product
export async function createProduct(formData: FormData) {
  await requireAuth();
  const reorderLevel = Math.max(
    0,
    parseInt((formData.get("reorderLevel") as string) || "10", 10) || 10,
  );

  await prisma.product.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      category: (formData.get("category") as string) || "Jersey",
      basePrice: parseFloat(formData.get("basePrice") as string),
      reorderLevel,
      image: (formData.get("image") as string) || null,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

// Update an existing product
export async function updateProduct(id: string, formData: FormData) {
  await requireAuth();

  await prisma.product.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      category: (formData.get("category") as string) || "Jersey",
      basePrice: parseFloat(formData.get("basePrice") as string),
      image: (formData.get("image") as string) || null,
      isActive: formData.get("isActive") === "true",
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

// Delete a product. If it has order history, archive it instead.
export async function deleteProduct(id: string): Promise<{
  status: "deleted" | "archived";
  message: string;
}> {
  await requireAuth();

  const linkedOrderItems = await prisma.orderItem.count({
    where: {
      variant: { productId: id },
    },
  });

  if (linkedOrderItems > 0) {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return {
      status: "archived",
      message:
        "This product is already referenced by orders, so it was archived instead of deleted.",
    };
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/products");
      revalidatePath("/admin");
      return {
        status: "archived",
        message:
          "This product became referenced by an order while deleting, so it was archived instead.",
      };
    }

    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { status: "deleted", message: "Product deleted." };
}

// Add a variant to a product
export async function createVariant(formData: FormData) {
  await requireAuth();
  const productId = formData.get("productId") as string;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { reorderLevel: true, basePrice: true },
  });

  if (!product) throw new Error("Product not found");

  const variantPriceRaw = (formData.get("variantPrice") as string) || "";
  const variantPrice = variantPriceRaw.trim()
    ? parseFloat(variantPriceRaw)
    : product.basePrice;

  if (!Number.isFinite(variantPrice) || variantPrice < 0) {
    throw new Error("Variant price must be a valid non-negative number.");
  }

  const priceAdjustment =
    Math.round((variantPrice - product.basePrice) * 100) / 100;

  const variant = await prisma.variant.create({
    data: {
      productId,
      size: formData.get("size") as string,
      color: formData.get("color") as string,
      sku: formData.get("sku") as string,
      image: (formData.get("image") as string) || null,
      priceAdjustment,
    },
  });

  // Auto-create inventory stock entry for this variant
  await prisma.inventoryStock.create({
    data: {
      variantId: variant.id,
      quantity: 0,
      reorderLevel: product.reorderLevel,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
}

// Delete a variant when not referenced by orders.
export async function deleteVariant(id: string): Promise<{
  status: "deleted" | "blocked";
  message: string;
}> {
  await requireAuth();

  const linkedOrderItems = await prisma.orderItem.count({
    where: { variantId: id },
  });

  if (linkedOrderItems > 0) {
    return {
      status: "blocked",
      message: "Cannot delete this variant because it is referenced by orders.",
    };
  }

  try {
    await prisma.variant.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        status: "blocked",
        message:
          "Cannot delete this variant because it became referenced by an order.",
      };
    }

    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  return {
    status: "deleted",
    message: "Variant deleted. Its inventory stock record was removed too.",
  };
}
