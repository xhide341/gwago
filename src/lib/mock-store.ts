// In-memory mock database store for demo mode (no PostgreSQL / Supabase connection required)

export type Role = "ADMIN" | "SUPER_ADMIN";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type SalesChannel = "DIRECT" | "SHOPEE" | "LAZADA" | "TIKTOK" | "OTHER";
export type TransactionType = "PAYMENT" | "REFUND";
export type PaymentMethod = "CASH" | "GCASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "OTHER";

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  password: string | null;
  role: Role;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  reorderLevel: number;
  image: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Variant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  image: string | null;
  priceAdjustment: number;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryStock {
  id: string;
  variantId: string;
  quantity: number;
  reorderLevel: number;
  lastRestocked: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  salesChannel: SalesChannel;
  channelFee: number;
  totalAmount: number;
  netAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productIdSnapshot: string | null;
  productNameSnapshot: string | null;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  adjustedPrice: number | null;
  subtotal: number;
  variantName: string | null;
  variantSku: string | null;
  variantSize: string | null;
  variantColor: string | null;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  type: TransactionType;
  method: PaymentMethod;
  reference: string | null;
  createdAt: Date;
}

class MockStore {
  users: User[] = [];
  products: Product[] = [];
  variants: Variant[] = [];
  stocks: InventoryStock[] = [];
  orders: Order[] = [];
  orderItems: OrderItem[] = [];
  transactions: Transaction[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    // Demo admin user
    this.users.push({
      id: "guest-id",
      name: "Guest User",
      email: "guest@gwago.com",
      emailVerified: new Date(),
      password: null,
      role: "ADMIN",
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const PRODUCTS_DATA = [
      { name: "Elite Basketball Jersey", category: "Jersey", basePrice: 680, description: "Premium basketball jersey with full sublimation print", image: "https://picsum.photos/seed/elite-basketball-jersey/400/400" },
      { name: "Pro Cycling Jersey", category: "Jersey", basePrice: 790, description: "Race-cut cycling jersey with breathable side panels", image: "https://picsum.photos/seed/pro-cycling-jersey/400/400" },
      { name: "Esports Team Jersey", category: "Jersey", basePrice: 620, description: "Lightweight team jersey for gaming squads and events", image: "https://picsum.photos/seed/esports-team-jersey/400/400" },
      { name: "Streetwear Graphic Tee", category: "T shirt", basePrice: 370, description: "Relaxed fit t-shirt for bold front-and-back prints", image: "https://picsum.photos/seed/streetwear-graphic-tee/400/400" },
      { name: "Performance Dry-Fit Tee", category: "T shirt", basePrice: 430, description: "Moisture-wicking fabric designed for training sessions", image: "https://picsum.photos/seed/performance-dryfit-tee/400/400" },
      { name: "Vintage Wash Tee", category: "T shirt", basePrice: 410, description: "Washed cotton tee with a soft hand-feel finish", image: "https://picsum.photos/seed/vintage-wash-tee/400/400" },
      { name: "UV Guard Long Sleeve", category: "Long sleeve", basePrice: 560, description: "Long sleeve top with UV protection and quick dry fabric", image: "https://picsum.photos/seed/uv-guard-longsleeve/400/400" },
      { name: "Training Long Sleeve", category: "Long sleeve", basePrice: 500, description: "Athletic long sleeve built for cooler training days", image: "https://picsum.photos/seed/training-longsleeve/400/400" },
      { name: "Hospitality Uniform Polo", category: "Uniform", basePrice: 470, description: "Durable and breathable uniform polo for service teams", image: "https://picsum.photos/seed/hospitality-uniform-polo/400/400" },
      { name: "Industrial Work Uniform", category: "Uniform", basePrice: 720, description: "Heavy-duty uniform set for warehouse and field staff", image: "https://picsum.photos/seed/industrial-work-uniform/400/400" },
      { name: "Clinic Staff Uniform", category: "Uniform", basePrice: 540, description: "Comfort-fit uniform for clinic and wellness teams", image: "https://picsum.photos/seed/clinic-staff-uniform/400/400" },
      { name: "Premium Polo Shirt", category: "Polo shirt", basePrice: 580, description: "Structured polo shirt ideal for uniforms and events", image: "https://picsum.photos/seed/premium-polo-shirt/400/400" },
    ];

    const SIZES = ["S", "M", "L", "XL", "2XL"];
    const COLORS = ["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Gray"];
    const CUSTOMER_NAMES = [
      "Juan Dela Cruz", "Maria Santos", "Jose Reyes", "Ana Garcia", "Pedro Mendoza",
      "Sofia Cruz", "Miguel Torres", "Isabella Ramos", "Carlos Villanueva", "Angela Bautista",
    ];

    let prodIdCounter = 1;
    let varIdCounter = 1;
    let stockIdCounter = 1;

    for (const prodData of PRODUCTS_DATA) {
      const pId = `prod_${prodIdCounter++}`;
      const product: Product = {
        id: pId,
        name: prodData.name,
        description: prodData.description,
        category: prodData.category,
        basePrice: prodData.basePrice,
        reorderLevel: 10,
        image: prodData.image,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        updatedAt: new Date(),
      };
      this.products.push(product);

      // Create variants & stocks
      const sizes = SIZES.slice(0, 3);
      const colors = COLORS.slice(0, 2);

      for (const size of sizes) {
        for (const color of colors) {
          const vId = `var_${varIdCounter++}`;
          const sku = `${prodData.name.replace(/\s+/g, "-").toUpperCase().slice(0, 8)}-${size}-${color.toUpperCase().slice(0, 3)}`;
          const priceAdj = size === "2XL" ? 50 : size === "XL" ? 25 : 0;
          
          const variant: Variant = {
            id: vId,
            productId: pId,
            size,
            color,
            sku: `${sku}-${100 + varIdCounter}`,
            image: null,
            priceAdjustment: priceAdj,
            isActive: true,
            archivedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.variants.push(variant);

          const qty = (varIdCounter % 5 === 0) ? 5 : 25 + (varIdCounter % 30);
          const stock: InventoryStock = {
            id: `stock_${stockIdCounter++}`,
            variantId: vId,
            quantity: qty,
            reorderLevel: 10,
            lastRestocked: new Date(Date.now() - (varIdCounter % 15) * 24 * 3600 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.stocks.push(stock);
        }
      }
    }

    // Seed orders
    let orderIdCounter = 1;
    let orderItemIdCounter = 1;
    let txIdCounter = 1;

    const statuses: OrderStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "COMPLETED", "COMPLETED"];
    const channels: SalesChannel[] = ["DIRECT", "SHOPEE", "LAZADA", "TIKTOK"];
    const methods: PaymentMethod[] = ["CASH", "GCASH", "BANK_TRANSFER"];

    for (let i = 0; i < 25; i++) {
      const oId = `ord_${orderIdCounter++}`;
      const customer = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
      const status = statuses[i % statuses.length];
      const channel = channels[i % channels.length];
      const daysAgo = Math.floor(i * 1.2);
      const orderDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

      // Select 1-2 variants
      const sampleVar = this.variants[i % this.variants.length];
      const prod = this.products.find((p) => p.id === sampleVar.productId)!;
      const unitPrice = prod.basePrice + sampleVar.priceAdjustment;
      const qty = (i % 3) + 1;
      const subtotal = unitPrice * qty;

      const orderItem: OrderItem = {
        id: `oi_${orderItemIdCounter++}`,
        orderId: oId,
        productIdSnapshot: prod.id,
        productNameSnapshot: prod.name,
        variantId: sampleVar.id,
        quantity: qty,
        unitPrice,
        adjustedPrice: null,
        subtotal,
        variantName: `${prod.name} - ${sampleVar.size}`,
        variantSku: sampleVar.sku,
        variantSize: sampleVar.size,
        variantColor: sampleVar.color,
        createdAt: orderDate,
      };
      this.orderItems.push(orderItem);

      const totalAmount = subtotal;
      const channelFee = channel === "DIRECT" ? 0 : Math.round(totalAmount * 0.05 * 100) / 100;
      const netAmount = totalAmount - channelFee;

      const order: Order = {
        id: oId,
        customerName: customer,
        customerEmail: `${customer.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        customerPhone: `0917${1000000 + i}`,
        status,
        salesChannel: channel,
        channelFee,
        totalAmount,
        netAmount,
        notes: null,
        createdAt: orderDate,
        updatedAt: orderDate,
      };
      this.orders.push(order);

      if (status !== "CANCELLED") {
        const method = methods[i % methods.length];
        const tx: Transaction = {
          id: `tx_${txIdCounter++}`,
          orderId: oId,
          amount: totalAmount,
          type: "PAYMENT",
          method,
          reference: method === "GCASH" ? `GC${100000000 + i}` : method === "BANK_TRANSFER" ? `BT${100000000 + i}` : null,
          createdAt: orderDate,
        };
        this.transactions.push(tx);
      }
    }
  }
}

const globalForMockStore = globalThis as unknown as { mockStore?: MockStore };
export const mockStore = globalForMockStore.mockStore ?? new MockStore();
if (process.env.NODE_ENV !== "production") globalForMockStore.mockStore = mockStore;
