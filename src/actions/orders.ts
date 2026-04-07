"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  OrderStatus,
  PaymentMethod,
  Prisma,
  SalesChannel,
} from "@/generated/prisma/client";

type TxClient = Prisma.TransactionClient;

type OrderItemInput = {
  id?: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  adjustedPrice?: number | null;
};

type UpdateOrderItemInput = {
  id?: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  adjustedPrice?: number | null;
  productIdSnapshot?: string | null;
  productNameSnapshot?: string | null;
  variantName?: string | null;
  variantSku?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
};

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

function validateOrderItems(
  items: Array<{ variantId: string | null; quantity: number }>,
  allowMissingVariant = false,
) {
  if (items.length === 0)
    throw new Error("Order must contain at least one item");

  for (const item of items) {
    if (!allowMissingVariant && !item.variantId) {
      throw new Error("Invalid variant");
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error("Item quantity must be greater than 0");
    }
  }
}

function sanitizeReference(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeOptionalReference(value?: string) {
  if (!value) return null;
  const normalized = sanitizeReference(value);
  return normalized ? normalized : null;
}

function buildReferenceCandidate() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return sanitizeReference(`REF-${date}-${random}`);
}

async function assertReferenceUniqueOrThrow(
  tx: TxClient,
  reference: string,
  excludeTransactionId?: string,
) {
  const existing = await tx.transaction.findFirst({
    where: {
      reference: {
        equals: reference,
        mode: "insensitive",
      },
      ...(excludeTransactionId && {
        id: { not: excludeTransactionId },
      }),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("Reference number already exists");
  }
}

export async function generateUniquePaymentReference() {
  await requireAuth();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = buildReferenceCandidate();
    const existing = await prisma.transaction.findFirst({
      where: {
        reference: {
          equals: candidate,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  throw new Error("Unable to generate a unique reference number");
}

function buildQuantityMap(
  items: Array<{ variantId: string | null; quantity: number }>,
  multiplier = 1,
) {
  const map = new Map<string, number>();

  for (const item of items) {
    // Skip items whose variant has been permanently deleted (variantId is null)
    if (!item.variantId) continue;
    const prev = map.get(item.variantId) ?? 0;
    map.set(item.variantId, prev + item.quantity * multiplier);
  }

  return map;
}

function addMapValues(
  target: Map<string, number>,
  source: Map<string, number>,
) {
  for (const [variantId, quantity] of source) {
    const prev = target.get(variantId) ?? 0;
    target.set(variantId, prev + quantity);
  }
}

function buildOrderItemSnapshot(
  item: {
    variantId: string | null;
    quantity: number;
    unitPrice: number;
    adjustedPrice?: number | null;
    subtotal: number;
    productIdSnapshot?: string | null;
    productNameSnapshot?: string | null;
    variantName?: string | null;
    variantSku?: string | null;
    variantSize?: string | null;
    variantColor?: string | null;
  },
  variant?: {
    id: string;
    sku: string;
    size: string;
    color: string;
    product: { id: string; name: string };
  },
) {
  return {
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    adjustedPrice: item.adjustedPrice ?? null,
    subtotal: item.subtotal,
    productIdSnapshot: variant?.product.id ?? item.productIdSnapshot ?? null,
    productNameSnapshot: variant?.product.name ?? item.productNameSnapshot ?? null,
    variantName:
      variant ? `${variant.product.name} - ${variant.size}` : item.variantName ?? null,
    variantSku: variant?.sku ?? item.variantSku ?? null,
    variantSize: variant?.size ?? item.variantSize ?? null,
    variantColor: variant?.color ?? item.variantColor ?? null,
  };
}

async function applyStockDeltaOrThrow(
  tx: TxClient,
  deltaByVariant: Map<string, number>,
) {
  // Apply decrements first so insufficiency fails immediately.
  for (const [variantId, delta] of deltaByVariant) {
    if (delta >= 0) continue;

    const required = Math.abs(delta);
    const result = await tx.inventoryStock.updateMany({
      where: {
        variantId,
        quantity: { gte: required },
      },
      data: {
        quantity: { decrement: required },
      },
    });

    if (result.count !== 1) {
      throw new Error(`Insufficient stock for variant ${variantId}`);
    }
  }

  for (const [variantId, delta] of deltaByVariant) {
    if (delta <= 0) continue;

    const result = await tx.inventoryStock.updateMany({
      where: { variantId },
      data: {
        quantity: { increment: delta },
      },
    });

    if (result.count !== 1) {
      throw new Error(`Stock record not found for variant ${variantId}`);
    }
  }
}

// Get all orders with items and transactions
export async function getOrders() {
  await requireAuth();
  return prisma.order.findMany({
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
      transactions: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get a single order by ID
export async function getOrderById(id: string) {
  await requireAuth();
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
      transactions: true,
    },
  });
}

// Create a new order with items
export async function createOrder(data: {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  salesChannel?: SalesChannel;
  channelFee?: number;
  items: OrderItemInput[];
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}) {
  await requireAuth();
  validateOrderItems(data.items);

  // Calculate totals - use adjustedPrice when set, otherwise unitPrice.
  const itemsWithSubtotal = data.items.map((item) => ({
    ...item,
    adjustedPrice: item.adjustedPrice ?? null,
    subtotal: item.quantity * (item.adjustedPrice ?? item.unitPrice),
  }));

  const totalAmount = itemsWithSubtotal.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  const channel = data.salesChannel || "DIRECT";
  const channelFee = Math.round((data.channelFee ?? 0) * 100) / 100;
  const netAmount = Math.round((totalAmount - channelFee) * 100) / 100;
  const requiredStock = buildQuantityMap(data.items);
  const paymentReference = normalizeOptionalReference(data.paymentReference);

  const order = await prisma.$transaction(async (tx) => {
    if (paymentReference && data.paymentMethod) {
      await assertReferenceUniqueOrThrow(tx, paymentReference);
    }

    const reserveDelta = new Map<string, number>(
      [...requiredStock.entries()].map(([variantId, qty]) => [variantId, -qty]),
    );

    await applyStockDeltaOrThrow(tx, reserveDelta);

    // Fetch variant details for snapshot columns (preserves history if variant is later deleted)
    const variantIds = data.items.map((i) => i.variantId);
    const variants = await tx.variant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        product: { select: { id: true, name: true } },
      },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    return tx.order.create({
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        notes: data.notes,
        salesChannel: channel,
        channelFee,
        totalAmount,
        netAmount,
        items: {
          create: itemsWithSubtotal.map((item) => {
            const v = variantMap.get(item.variantId);
            return {
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              adjustedPrice: item.adjustedPrice,
              subtotal: item.subtotal,
              productIdSnapshot: v?.product.id ?? null,
              productNameSnapshot: v?.product.name ?? null,
              // Snapshot for historical display after variant deletion
              variantName: v ? `${v.product.name} – ${v.size}` : null,
              variantSku: v?.sku ?? null,
              variantSize: v?.size ?? null,
              variantColor: v?.color ?? null,
            };
          }),
        },
        // Auto-create a payment transaction if method provided.
        ...(data.paymentMethod && {
          transactions: {
            create: {
              amount: totalAmount,
              type: "PAYMENT",
              method: data.paymentMethod,
              reference: paymentReference,
            },
          },
        }),
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");

  return order;
}

// Update order status
export async function updateOrderStatus(id: string, status: OrderStatus) {
  await requireAuth();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");
    if (order.status === status) return;

    const wasDeducted = order.status !== "CANCELLED";
    const shouldBeDeducted = status !== "CANCELLED";

    if (wasDeducted && !shouldBeDeducted) {
      await applyStockDeltaOrThrow(tx, buildQuantityMap(order.items, 1));
    }

    if (!wasDeducted && shouldBeDeducted) {
      const reserveDelta = new Map<string, number>(
        [...buildQuantityMap(order.items).entries()].map(([variantId, qty]) => [
          variantId,
          -qty,
        ]),
      );
      await applyStockDeltaOrThrow(tx, reserveDelta);
    }

    await tx.order.update({
      where: { id },
      data: { status },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

// Delete an order and restore reserved stock when applicable.
export async function deleteOrder(id: string) {
  await requireAuth();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) throw new Error("Order not found");

    if (order.status !== "CANCELLED") {
      await applyStockDeltaOrThrow(tx, buildQuantityMap(order.items, 1));
    }

    await tx.order.delete({ where: { id } });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

// Update order details (customer info, channel, items)
export async function updateOrder(
  id: string,
  data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: string;
    salesChannel: SalesChannel;
    channelFee?: number;
    status: OrderStatus;
    paymentReference?: string;
    items: UpdateOrderItemInput[];
  },
) {
  await requireAuth();
  validateOrderItems(data.items, true);

  // Calculate totals - use adjustedPrice when set, otherwise unitPrice.
  const itemsWithSubtotal = data.items.map((item) => ({
    ...item,
    adjustedPrice: item.adjustedPrice ?? null,
    subtotal: item.quantity * (item.adjustedPrice ?? item.unitPrice),
  }));

  const totalAmount = itemsWithSubtotal.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  const channelFee = Math.round((data.channelFee ?? 0) * 100) / 100;
  const netAmount = Math.round((totalAmount - channelFee) * 100) / 100;
  const paymentReference =
    data.paymentReference === undefined
      ? undefined
      : normalizeOptionalReference(data.paymentReference);

  await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id },
      include: {
        items: true,
        transactions: {
          select: { id: true, type: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!currentOrder) throw new Error("Order not found");

    const paymentTx =
      currentOrder.transactions.find(
        (transaction) => transaction.type === "PAYMENT",
      ) ?? currentOrder.transactions[0];

    if (paymentReference !== undefined && paymentReference && paymentTx) {
      await assertReferenceUniqueOrThrow(tx, paymentReference, paymentTx.id);
    }

    const deltaByVariant = new Map<string, number>();
    if (currentOrder.status !== "CANCELLED") {
      addMapValues(deltaByVariant, buildQuantityMap(currentOrder.items, 1));
    }
    if (data.status !== "CANCELLED") {
      addMapValues(deltaByVariant, buildQuantityMap(data.items, -1));
    }

    await applyStockDeltaOrThrow(tx, deltaByVariant);

    await tx.orderItem.deleteMany({ where: { orderId: id } });

    // Fetch variant snapshots for newly created items
    const newVariantIds = itemsWithSubtotal
      .map((item) => item.variantId)
      .filter((variantId): variantId is string => Boolean(variantId));
    const newVariants = await tx.variant.findMany({
      where: { id: { in: newVariantIds } },
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        product: { select: { id: true, name: true } },
      },
    });
    const newVariantMap = new Map(newVariants.map((v) => [v.id, v]));

    await tx.order.update({
      where: { id },
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        notes: data.notes || null,
        salesChannel: data.salesChannel,
        status: data.status,
        channelFee,
        totalAmount,
        netAmount,
        items: {
          create: itemsWithSubtotal.map((item) => {
            const v = item.variantId
              ? newVariantMap.get(item.variantId)
              : undefined;
            if (!v) {
              return buildOrderItemSnapshot(item);
            }
            return {
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              adjustedPrice: item.adjustedPrice,
              subtotal: item.subtotal,
              productIdSnapshot: v.product.id,
              productNameSnapshot: v.product.name,
              variantName: v ? `${v.product.name} – ${v.size}` : null,
              variantSku: v?.sku ?? null,
              variantSize: v?.size ?? null,
              variantColor: v?.color ?? null,
            };
          }),
        },
      },
    });

    if (paymentReference !== undefined) {
      if (paymentTx) {
        await tx.transaction.update({
          where: { id: paymentTx.id },
          data: { reference: paymentReference },
        });
      }
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

// Update a transaction's payment method
export async function updateTransactionMethod(
  transactionId: string,
  method: PaymentMethod,
) {
  await requireAuth();

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { method },
  });

  revalidatePath("/admin/orders");
}

// Get order stats for dashboard
export async function getOrderStats() {
  await requireAuth();

  const [totalOrders, pendingOrders, todayRevenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.transaction.aggregate({
      where: {
        type: "PAYMENT",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    todayRevenue: todayRevenue._sum.amount ?? 0,
  };
}

// Get recent orders (last 5) for dashboard
export async function getRecentOrders() {
  await requireAuth();
  return prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });
}
