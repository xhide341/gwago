"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getProductDeleteSummary,
  getVariantDeleteDecision,
} from "@/lib/catalog-delete";

// ─── Auth guard helper ───
async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function archiveProductAndVariants(productId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    await tx.variant.updateMany({
      where: { productId },
      data: { isActive: false },
    });

    await tx.variant.updateMany({
      where: {
        productId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });
  });
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

// Get products/variants that are available for new order selection
export async function getOrderableProducts() {
  await requireAuth();
  return prisma.product.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        include: {
          stock: true,
        },
      },
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

  const deleteSummary = await getProductDeleteSummary(id);

  const stockRecords = product.variants.filter((variant) =>
    Boolean(variant.stock),
  ).length;

  return {
    product: {
      id: product.id,
      name: product.name,
      isActive: product.isActive,
    },
    variantCount: product.variants.length,
    stockRecordCount: stockRecords,
    linkedOrderItems: deleteSummary.linkedOrderItems,
    linkedOrdersByStatus: deleteSummary.linkedOrdersByStatus,
    canDeletePermanently: deleteSummary.linkedOrderItems === 0,
    recommendedAction: deleteSummary.recommendedAction,
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

  const nextIsActive = formData.get("isActive") === "true";

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        category: (formData.get("category") as string) || "Jersey",
        basePrice: parseFloat(formData.get("basePrice") as string),
        image: (formData.get("image") as string) || null,
        isActive: nextIsActive,
      },
    });

    if (!nextIsActive) {
      await tx.variant.updateMany({
        where: { productId: id },
        data: { isActive: false },
      });
    }
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

// Delete a product. If it has order history, archive it instead.
export async function deleteProduct(id: string): Promise<{
  status: "deleted" | "archived" | "blocked";
  message: string;
}> {
  await requireAuth();

  const summary = await getProductDeleteSummary(id);

  if (summary.decision.status === "blocked") {
    return {
      status: "blocked",
      message: summary.decision.message,
    };
  }

  if (summary.decision.status === "archived") {
    await archiveProductAndVariants(id);

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidatePath("/admin/archived");
    return {
      status: "archived",
      message: summary.decision.message,
    };
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    const retrySummary = await getProductDeleteSummary(id);

    if (retrySummary.decision.status === "archived") {
      await archiveProductAndVariants(id);

      revalidatePath("/admin/products");
      revalidatePath("/admin/inventory");
      revalidatePath("/admin");
      revalidatePath("/admin/archived");
      return {
        status: "archived",
        message: "Product archived instead of deleted.",
      };
    }

    if (retrySummary.decision.status === "blocked") {
      return {
        status: "blocked",
        message: retrySummary.decision.message,
      };
    }

    throw new Error("Unable to delete this product right now.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/admin/archived");
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

// Update an existing variant.
export async function updateVariant(id: string, formData: FormData) {
  await requireAuth();

  const variant = await prisma.variant.findUnique({
    where: { id },
    select: { productId: true },
  });

  if (!variant) throw new Error("Variant not found");

  const product = await prisma.product.findUnique({
    where: { id: variant.productId },
    select: { basePrice: true },
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

  await prisma.variant.update({
    where: { id },
    data: {
      size: formData.get("size") as string,
      color: formData.get("color") as string,
      sku: formData.get("sku") as string,
      image: (formData.get("image") as string) || null,
      priceAdjustment,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
}

// Delete a variant when not referenced by orders.
export async function deleteVariant(id: string): Promise<{
  status: "deleted" | "archived" | "blocked";
  message: string;
}> {
  await requireAuth();

  const decision = await getVariantDeleteDecision(id);

  if (decision.status === "blocked") {
    return {
      status: "blocked",
      message: decision.message,
    };
  }

  if (decision.status === "archived") {
    await prisma.variant.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidatePath("/admin/archived");
    return {
      status: "archived",
      message: decision.message,
    };
  }

  try {
    await prisma.variant.delete({ where: { id } });
  } catch {
    const retryDecision = await getVariantDeleteDecision(id);

    if (retryDecision.status === "archived") {
      await prisma.variant.update({
        where: { id },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
      });

      revalidatePath("/admin/products");
      revalidatePath("/admin/inventory");
      revalidatePath("/admin");
      revalidatePath("/admin/archived");
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

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/archived");
  return {
    status: "deleted",
    message: "Variant deleted.",
  };
}

// ─── Archived items ───

/** Fetch all archived products with variants and delete eligibility info */
export async function getArchivedProducts() {
  await requireAuth();

  const products = await prisma.product.findMany({
    where: { isActive: false },
    include: {
      variants: {
        include: {
          // Count only active orders that would BLOCK deletion
          _count: { select: { orderItems: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { variants: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    products.map(async (product) => {
      const summary = await getProductDeleteSummary(product.id);

      return {
        ...product,
        totalOrderRefs: summary.linkedOrderItems,
        canDelete: summary.linkedOrderItems === 0,
      };
    }),
  );
}

/** Fetch archived variants whose parent product is still active. */
export async function getArchivedVariants() {
  await requireAuth();

  return prisma.variant.findMany({
    where: {
      isActive: false,
      product: {
        isActive: true,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
    orderBy: [{ archivedAt: "desc" }, { updatedAt: "desc" }],
  });
}

/** Restore a product and all its variants back to active */
export async function restoreProduct(id: string): Promise<{ message: string }> {
  await requireAuth();

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { isActive: true },
    });
    await tx.variant.updateMany({
      where: { productId: id },
      data: { isActive: true },
    });
    await tx.variant.updateMany({
      where: { productId: id },
      data: { archivedAt: null },
    });
  });

  revalidatePath("/admin/archived");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { message: "Product restored successfully." };
}

/** Permanently delete an archived product only when it has no order references. */
export async function permanentlyDeleteProduct(id: string): Promise<{
  status: "deleted" | "blocked";
  message: string;
}> {
  await requireAuth();

  const summary = await getProductDeleteSummary(id);

  if (summary.linkedOrderItems > 0) {
    return {
      status: "blocked",
      message:
        summary.decision.status === "blocked"
          ? summary.decision.message
          : "Cannot permanently delete this product because it has historical order references. Keep it archived instead.",
    };
  }

  await prisma.product.delete({ where: { id } });

  revalidatePath("/admin/archived");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { status: "deleted", message: "Product permanently deleted." };
}
