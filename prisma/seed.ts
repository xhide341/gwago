import "dotenv/config";
import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── Helpers ───
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
  return d;
}

// ─── Seed Data ───
const PRODUCTS = [
  {
    name: "Elite Basketball Jersey",
    category: "Jersey",
    basePrice: 680,
    description: "Premium basketball jersey with full sublimation print",
    image: "https://picsum.photos/seed/elite-basketball-jersey/400/400",
  },
  {
    name: "Pro Cycling Jersey",
    category: "Jersey",
    basePrice: 790,
    description: "Race-cut cycling jersey with breathable side panels",
    image: "https://picsum.photos/seed/pro-cycling-jersey/400/400",
  },
  {
    name: "Esports Team Jersey",
    category: "Jersey",
    basePrice: 620,
    description: "Lightweight team jersey for gaming squads and events",
    image: "https://picsum.photos/seed/esports-team-jersey/400/400",
  },
  {
    name: "Streetwear Graphic Tee",
    category: "T shirt",
    basePrice: 370,
    description: "Relaxed fit t-shirt for bold front-and-back prints",
    image: "https://picsum.photos/seed/streetwear-graphic-tee/400/400",
  },
  {
    name: "Performance Dry-Fit Tee",
    category: "T shirt",
    basePrice: 430,
    description: "Moisture-wicking fabric designed for training sessions",
    image: "https://picsum.photos/seed/performance-dryfit-tee/400/400",
  },
  {
    name: "Vintage Wash Tee",
    category: "T shirt",
    basePrice: 410,
    description: "Washed cotton tee with a soft hand-feel finish",
    image: "https://picsum.photos/seed/vintage-wash-tee/400/400",
  },
  {
    name: "UV Guard Long Sleeve",
    category: "Long sleeve",
    basePrice: 560,
    description: "Long sleeve top with UV protection and quick dry fabric",
    image: "https://picsum.photos/seed/uv-guard-longsleeve/400/400",
  },
  {
    name: "Training Long Sleeve",
    category: "Long sleeve",
    basePrice: 500,
    description: "Athletic long sleeve built for cooler training days",
    image: "https://picsum.photos/seed/training-longsleeve/400/400",
  },
  {
    name: "Hospitality Uniform Polo",
    category: "Uniform",
    basePrice: 470,
    description: "Durable and breathable uniform polo for service teams",
    image: "https://picsum.photos/seed/hospitality-uniform-polo/400/400",
  },
  {
    name: "Industrial Work Uniform",
    category: "Uniform",
    basePrice: 720,
    description: "Heavy-duty uniform set for warehouse and field staff",
    image: "https://picsum.photos/seed/industrial-work-uniform/400/400",
  },
  {
    name: "Clinic Staff Uniform",
    category: "Uniform",
    basePrice: 540,
    description: "Comfort-fit uniform for clinic and wellness teams",
    image: "https://picsum.photos/seed/clinic-staff-uniform/400/400",
  },
  {
    name: "Premium Polo Shirt",
    category: "Polo shirt",
    basePrice: 580,
    description: "Structured polo shirt ideal for uniforms and events",
    image: "https://picsum.photos/seed/premium-polo-shirt/400/400",
  },
];

const SIZES = ["S", "M", "L", "XL", "2XL"];
const COLORS = [
  "Black",
  "White",
  "Navy",
  "Red",
  "Royal Blue",
  "Maroon",
  "Gray",
];
const CUSTOMER_NAMES = [
  "Juan Dela Cruz",
  "Maria Santos",
  "Jose Reyes",
  "Ana Garcia",
  "Pedro Mendoza",
  "Sofia Cruz",
  "Miguel Torres",
  "Isabella Ramos",
  "Carlos Villanueva",
  "Angela Bautista",
  "Roberto Aquino",
  "Patricia Lim",
  "Marco Tan",
  "Camille Rivera",
  "Diego Fernandez",
  "Jenny Ong",
  "Ramon Castillo",
  "Bianca Morales",
  "Francis Pascual",
  "Rina Evangelista",
];
const PAYMENT_METHODS = ["CASH", "GCASH", "BANK_TRANSFER"] as const;
const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
] as const;
const SALES_CHANNELS = [
  "DIRECT",
  "DIRECT",
  "DIRECT",
  "SHOPEE",
  "SHOPEE",
  "LAZADA",
  "TIKTOK",
] as const;

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  console.log("  ✓ Cleared existing data");

  // Create products with variants and stock
  const createdProducts = [];
  for (const prod of PRODUCTS) {
    // Pick 3-5 random sizes and 2-4 random colors
    const sizes = SIZES.sort(() => Math.random() - 0.5).slice(
      0,
      randomInt(3, 5),
    );
    const colors = COLORS.sort(() => Math.random() - 0.5).slice(
      0,
      randomInt(2, 4),
    );

    const variants = [];
    for (const size of sizes) {
      for (const color of colors) {
        const sku = `${prod.name.replace(/\s+/g, "-").toUpperCase().slice(0, 8)}-${size}-${color.replace(/\s+/g, "").toUpperCase().slice(0, 4)}`;
        const quantity = randomInt(0, 80);
        variants.push({
          size,
          color,
          sku: `${sku}-${randomInt(100, 999)}`,
          priceAdjustment: size === "2XL" ? 50 : size === "XL" ? 25 : 0,
          stock: {
            create: {
              quantity,
              reorderLevel: 10,
              lastRestocked: quantity > 0 ? daysAgo(randomInt(1, 30)) : null,
            },
          },
        });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: prod.name,
        description: prod.description,
        category: prod.category,
        basePrice: prod.basePrice,
        image: prod.image,
        isActive: true,
        variants: { create: variants },
      },
      include: { variants: true },
    });
    createdProducts.push(product);
  }
  console.log(
    `  ✓ Created ${createdProducts.length} products with variants & stock`,
  );

  // Collect all variant IDs for order items
  const allVariants = await prisma.variant.findMany({
    include: { product: true, stock: true },
  });

  // Create orders spread over the last 30 days
  const orderCount = 75;
  for (let i = 0; i < orderCount; i++) {
    const daysBack = randomInt(0, 30);
    const createdAt = daysAgo(daysBack);

    // Pick 1-4 random items for this order
    const itemCount = randomInt(1, 4);
    const selectedVariants = allVariants
      .sort(() => Math.random() - 0.5)
      .slice(0, itemCount);

    const items = selectedVariants.map((v) => {
      const qty = randomInt(1, 10);
      const unitPrice = v.product.basePrice + v.priceAdjustment;
      return {
        variantId: v.id,
        quantity: qty,
        unitPrice,
        subtotal: unitPrice * qty,
        createdAt,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Weighted status distribution: mostly completed, some pending/processing
    let status: (typeof ORDER_STATUSES)[number];
    if (daysBack === 0) {
      status = randomItem(["PENDING", "PROCESSING", "COMPLETED"] as const);
    } else if (daysBack <= 2) {
      status = randomItem(["PROCESSING", "COMPLETED", "COMPLETED"] as const);
    } else {
      status = randomItem([
        "COMPLETED",
        "COMPLETED",
        "COMPLETED",
        "CANCELLED",
      ] as const);
    }

    const customer = randomItem(CUSTOMER_NAMES);
    const salesChannel = randomItem(SALES_CHANNELS);
    // Random deduction: marketplace orders sometimes have fees
    const channelFee =
      salesChannel === "DIRECT"
        ? 0
        : Math.round(totalAmount * (randomInt(3, 12) / 100) * 100) / 100;
    const netAmount = Math.round((totalAmount - channelFee) * 100) / 100;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        customerName: customer,
        customerEmail: `${customer.toLowerCase().replace(/\s+/g, ".")}@email.com`,
        customerPhone: `09${randomInt(10, 99)}${randomInt(1000000, 9999999)}`,
        status,
        salesChannel,
        channelFee,
        totalAmount,
        netAmount,
        createdAt,
        updatedAt: createdAt,
        items: { create: items },
      },
    });

    // Add payment transaction for non-cancelled orders
    if (status !== "CANCELLED") {
      const method = randomItem(PAYMENT_METHODS);
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          type: "PAYMENT",
          method,
          reference:
            method === "GCASH"
              ? `GC${randomInt(100000000, 999999999)}`
              : method === "BANK_TRANSFER"
                ? `BT${randomInt(100000000, 999999999)}`
                : null,
          createdAt,
        },
      });
    }
  }
  console.log(`  ✓ Created ${orderCount} orders with items & payments`);

  // Summary
  const stats = await Promise.all([
    prisma.product.count(),
    prisma.variant.count(),
    prisma.inventoryStock.count(),
    prisma.order.count(),
    prisma.transaction.count(),
  ]);
  console.log(`\n📊 Database summary:`);
  console.log(`   Products:   ${stats[0]}`);
  console.log(`   Variants:   ${stats[1]}`);
  console.log(`   Stock:      ${stats[2]}`);
  console.log(`   Orders:     ${stats[3]}`);
  console.log(`   Payments:   ${stats[4]}`);
  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




