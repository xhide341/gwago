import { OrderStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["PENDING", "PROCESSING"];
const HISTORICAL_ORDER_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

export type DeleteFlowStatus = "deleted" | "archived" | "blocked";

export type DeleteDecision = {
  status: DeleteFlowStatus;
  message: string;
  activeOrderCount: number;
  historicalOrderCount: number;
  linkedOrderItems: number;
};

function getProductHistoryWhere(productId: string): Prisma.OrderItemWhereInput {
  return {
    OR: [
      { productIdSnapshot: productId },
      {
        productIdSnapshot: null,
        variant: {
          is: {
            productId,
          },
        },
      },
    ],
  };
}

async function getOrderCountsByStatus(
  db: DbClient,
  where: Prisma.OrderItemWhereInput,
) {
  const [pending, processing, completed, cancelled] = await Promise.all([
    db.order.count({
      where: {
        status: "PENDING",
        items: { some: where },
      },
    }),
    db.order.count({
      where: {
        status: "PROCESSING",
        items: { some: where },
      },
    }),
    db.order.count({
      where: {
        status: "COMPLETED",
        items: { some: where },
      },
    }),
    db.order.count({
      where: {
        status: "CANCELLED",
        items: { some: where },
      },
    }),
  ]);

  return {
    PENDING: pending,
    PROCESSING: processing,
    COMPLETED: completed,
    CANCELLED: cancelled,
  };
}

export async function getVariantDeleteDecision(
  variantId: string,
  db: DbClient = prisma,
): Promise<DeleteDecision> {
  const [linkedOrderItems, activeOrderCount, historicalOrderCount] =
    await Promise.all([
      db.orderItem.count({
        where: { variantId },
      }),
      db.order.count({
        where: {
          status: { in: ACTIVE_ORDER_STATUSES },
          items: { some: { variantId } },
        },
      }),
      db.order.count({
        where: {
          status: { in: HISTORICAL_ORDER_STATUSES },
          items: { some: { variantId } },
        },
      }),
    ]);

  if (activeOrderCount > 0) {
    return {
      status: "blocked",
      message: `Cannot archive this variant because it is used in ${activeOrderCount} active order${activeOrderCount !== 1 ? "s" : ""}. Complete or cancel those orders first.`,
      activeOrderCount,
      historicalOrderCount,
      linkedOrderItems,
    };
  }

  if (linkedOrderItems > 0) {
    return {
      status: "archived",
      message: "Variant archived.",
      activeOrderCount,
      historicalOrderCount,
      linkedOrderItems,
    };
  }

  return {
    status: "deleted",
    message: "Variant deleted.",
    activeOrderCount,
    historicalOrderCount,
    linkedOrderItems,
  };
}

export async function getProductDeleteSummary(
  productId: string,
  db: DbClient = prisma,
) {
  const orderItemWhere = getProductHistoryWhere(productId);
  const [linkedOrderItems, linkedOrdersByStatus] = await Promise.all([
    db.orderItem.count({ where: orderItemWhere }),
    getOrderCountsByStatus(db, orderItemWhere),
  ]);

  const activeOrderCount =
    linkedOrdersByStatus.PENDING + linkedOrdersByStatus.PROCESSING;
  const historicalOrderCount =
    linkedOrdersByStatus.COMPLETED + linkedOrdersByStatus.CANCELLED;

  let recommendedAction: "DELETE" | "ARCHIVE" | "BLOCKED" = "DELETE";
  let status: DeleteFlowStatus = "deleted";
  let message = "Product deleted.";

  if (activeOrderCount > 0) {
    recommendedAction = "BLOCKED";
    status = "blocked";
    message = `Cannot archive this product because it is used in ${activeOrderCount} active order${activeOrderCount !== 1 ? "s" : ""}. Complete or cancel those orders first.`;
  } else if (linkedOrderItems > 0) {
    recommendedAction = "ARCHIVE";
    status = "archived";
    message = "Product archived. Order history was preserved.";
  }

  return {
    linkedOrderItems,
    linkedOrdersByStatus,
    activeOrderCount,
    historicalOrderCount,
    recommendedAction,
    decision: {
      status,
      message,
      activeOrderCount,
      historicalOrderCount,
      linkedOrderItems,
    } satisfies DeleteDecision,
  };
}
