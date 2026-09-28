"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type PublicOrderItemInput = {
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  playerName?: string;
  playerNumber?: string;
};

export type SubmitPublicOrderInput = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  socialHandle?: string;
  teamName?: string;
  customNotes?: string;
  items: PublicOrderItemInput[];
};

export type PublicOrderResult = {
  success: boolean;
  orderId?: string;
  orderReference?: string;
  totalAmount?: number;
  itemCount?: number;
  error?: string;
};

function generateOrderReference(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `GW-${datePart}-${suffix}`;
}

export async function submitPublicOrder(data: SubmitPublicOrderInput): Promise<PublicOrderResult> {
  try {
    if (!data.customerName || !data.customerName.trim()) {
      return { success: false, error: "Customer name is required." };
    }

    if (!data.customerPhone && !data.customerEmail) {
      return {
        success: false,
        error: "Please provide either a phone number or an email address.",
      };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "Order must contain at least one item." };
    }

    // Validate quantities
    const totalQuantity = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (totalQuantity <= 0) {
      return { success: false, error: "Total quantity must be greater than zero." };
    }

    let discountMultiplier = 1;
    let promoNote: string | null = null;
    if (totalQuantity >= 25) {
      discountMultiplier = 0.7;
      promoNote = "[PROMO]: Applied 30% Volume Discount (25+ Items - Best Value)";
    } else if (totalQuantity >= 10) {
      discountMultiplier = 0.8;
      promoNote = "[PROMO]: Applied 20% Volume Discount (10–24 Items)";
    } else if (totalQuantity >= 3) {
      discountMultiplier = 0.85;
      promoNote = "[PROMO]: Applied 15% Volume Discount (3–9 Items)";
    }
    const hasVolumeDiscount = discountMultiplier < 1;

    let calculatedTotal = 0;
    const orderItemsData = data.items
      .filter((item) => item.quantity > 0)
      .map((item) => {
        const discountedUnitPrice = Math.round(item.unitPrice * discountMultiplier);
        const subtotal = item.quantity * discountedUnitPrice;
        calculatedTotal += subtotal;

        const playerInfo = [
          item.playerName?.trim(),
          item.playerNumber ? `#${item.playerNumber.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        return {
          productIdSnapshot: item.productId,
          productNameSnapshot: item.productName,
          variantSize: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          adjustedPrice: hasVolumeDiscount ? discountedUnitPrice : null,
          subtotal,
          variantName: playerInfo || null,
        };
      });

    const orderReference = generateOrderReference();

    // Construct structured notes section
    const noteSections: string[] = [`[ORDER REFERENCE]: ${orderReference}`];

    if (data.teamName?.trim()) {
      noteSections.push(`[TEAM / BRAND]: ${data.teamName.trim()}`);
    }

    if (data.socialHandle?.trim()) {
      noteSections.push(`[MESSENGER / IG]: ${data.socialHandle.trim()}`);
    }

    if (data.shippingAddress?.trim()) {
      noteSections.push(`[SHIPPING ADDRESS]: ${data.shippingAddress.trim()}`);
    }

    if (data.customNotes?.trim()) {
      noteSections.push(`[CUSTOM SPECS & NOTES]:\n${data.customNotes.trim()}`);
    }

    // Include roster breakdown in notes if player names were provided
    const rosterLines = data.items
      .filter((i) => i.playerName?.trim() || i.playerNumber?.trim())
      .map(
        (i) =>
          `• Size ${i.size} - ${i.playerName?.trim() || "No Name"} ${i.playerNumber ? `(#${i.playerNumber.trim()})` : ""} (Qty: ${i.quantity})`,
      );

    if (rosterLines.length > 0) {
      noteSections.push(`[ROSTER BREAKDOWN]:\n${rosterLines.join("\n")}`);
    }

    if (promoNote) {
      noteSections.push(promoNote);
    }

    const order = await prisma.order.create({
      data: {
        customerName: data.customerName.trim(),
        customerEmail: data.customerEmail?.trim() || null,
        customerPhone: data.customerPhone?.trim() || null,
        status: "PENDING",
        salesChannel: "DIRECT",
        totalAmount: calculatedTotal,
        netAmount: calculatedTotal,
        notes: noteSections.join("\n\n"),
        items: {
          create: orderItemsData,
        },
      },
    });

    // Revalidate admin pages so new pending orders appear on admin dashboard
    revalidatePath("/admin/orders");
    revalidatePath("/admin");

    return {
      success: true,
      orderId: order.id,
      orderReference,
      totalAmount: calculatedTotal,
      itemCount: totalQuantity,
    };
  } catch (err: unknown) {
    console.error("Failed to submit public order:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while placing the order.",
    };
  }
}
