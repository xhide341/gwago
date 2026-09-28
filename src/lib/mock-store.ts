// for demo mode
import { CATALOG_PRODUCTS } from "./catalog-data";

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

export type SelectedVariant = Pick<Variant, "id" | "sku" | "size" | "color"> & {
  product: Pick<Product, "id" | "name">;
};

export type VariantWithMeta = Variant & {
  stock?: { quantity: number } | null;
  _count: { orderItems: number };
};

export type ProductVariantImpact = Pick<Variant, "id" | "sku" | "size" | "color"> & {
  stock: Pick<InventoryStock, "quantity"> | null;
  _count: { orderItems: number };
};

export type OrderStatusGroup = {
  status: OrderStatus;
  _count: { _all: number };
};

export type PaymentMethodGroup = {
  method: PaymentMethod;
  _count: { _all: number };
  _sum: { amount: number | null };
};

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
    ];

    let varIdCounter = 1;
    let stockIdCounter = 1;

    for (const catProd of CATALOG_PRODUCTS) {
      const pId = catProd.id;
      const product: Product = {
        id: pId,
        name: catProd.name,
        description: catProd.description,
        category: catProd.category,
        basePrice: catProd.price,
        reorderLevel: 10,
        image: catProd.frontImage.src,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        updatedAt: new Date(),
      };
      this.products.push(product);

      const sizes = catProd.sizes;
      const colors = ["Black", "White", "Navy"];

      for (const size of sizes) {
        for (const color of colors) {
          const vId = `var_${varIdCounter++}`;
          const prefix = catProd.name
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 6);
          const sku = `GW-${prefix}-${size}-${color.toUpperCase().slice(0, 3)}`;
          const priceAdj = size === "3XL" ? 75 : size === "2XL" ? 50 : size === "XL" ? 25 : 0;

          const variant: Variant = {
            id: vId,
            productId: pId,
            size,
            color,
            sku: `${sku}-${100 + varIdCounter}`,
            image: catProd.frontImage.src,
            priceAdjustment: priceAdj,
            isActive: true,
            archivedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.variants.push(variant);

          const qty = varIdCounter % 5 === 0 ? 5 : 25 + (varIdCounter % 30);
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

    let orderIdCounter = 1;
    let orderItemIdCounter = 1;
    let txIdCounter = 1;

    const statuses: OrderStatus[] = [
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
    ];
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
          reference:
            method === "GCASH"
              ? `GC${100000000 + i}`
              : method === "BANK_TRANSFER"
                ? `BT${100000000 + i}`
                : null,
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
