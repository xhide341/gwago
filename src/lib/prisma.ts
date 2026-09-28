import "dotenv/config";
import type { PrismaClient, Prisma } from "../generated/prisma/client";
import {
  mockStore,
  Product,
  Variant,
  InventoryStock,
  Order,
  OrderItem,
  Transaction,
  User,
  OrderStatus,
  SalesChannel,
  TransactionType,
  PaymentMethod,
} from "./mock-store";

export * from "../generated/prisma/client";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ProductInclude {
  variants?:
    | boolean
    | {
        where?: { isActive?: boolean };
        orderBy?: { createdAt?: "asc" | "desc" };
        include?: VariantInclude;
      };
  _count?: {
    select?: { variants?: boolean };
  };
}

interface VariantInclude {
  product?: boolean | { include?: ProductInclude };
  stock?: boolean;
  _count?: {
    select?: { orderItems?: boolean };
  };
}

interface StockInclude {
  variant?: boolean | { include?: VariantInclude };
}

interface OrderItemInclude {
  variant?: boolean | { include?: VariantInclude };
}

interface OrderInclude {
  items?: boolean | { include?: OrderItemInclude };
  transactions?: boolean;
  _count?: {
    select?: { items?: boolean };
  };
}

interface DateFilter {
  gte?: string | Date;
  lte?: string | Date;
  gt?: string | Date;
  lt?: string | Date;
}

function enrichProduct(
  p: Product,
  include?: ProductInclude | null,
): Product & Record<string, unknown> {
  if (!include) return { ...p };
  const res: Product & Record<string, unknown> = { ...p };
  if (include.variants) {
    let vars = mockStore.variants.filter((v) => v.productId === p.id);
    if (typeof include.variants === "object" && include.variants.where) {
      const w = include.variants.where;
      if (w.isActive !== undefined) vars = vars.filter((v) => v.isActive === w.isActive);
    }
    if (typeof include.variants === "object" && include.variants.orderBy?.createdAt === "asc") {
      vars.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    const subInclude = typeof include.variants === "object" ? include.variants.include : undefined;
    res.variants = vars.map((v) => enrichVariant(v, subInclude));
  }
  if (include._count?.select?.variants) {
    const counts = (res._count as Record<string, number> | undefined) || {};
    counts.variants = mockStore.variants.filter((v) => v.productId === p.id).length;
    res._count = counts;
  }
  return res;
}

function enrichVariant(
  v: Variant,
  include?: VariantInclude | null,
): Variant & Record<string, unknown> {
  if (!include) return { ...v };
  const res: Variant & Record<string, unknown> = { ...v };
  if (include.product) {
    const prod = mockStore.products.find((p) => p.id === v.productId);
    const subInclude = typeof include.product === "object" ? include.product.include : undefined;
    res.product = prod ? enrichProduct(prod, subInclude) : null;
  }
  if (include.stock) {
    res.stock = mockStore.stocks.find((s) => s.variantId === v.id) || null;
  }
  if (include._count?.select?.orderItems) {
    const counts = (res._count as Record<string, number> | undefined) || {};
    counts.orderItems = mockStore.orderItems.filter((oi) => oi.variantId === v.id).length;
    res._count = counts;
  }
  return res;
}

function enrichStock(
  s: InventoryStock,
  include?: StockInclude | null,
): InventoryStock & Record<string, unknown> {
  if (!include) return { ...s };
  const res: InventoryStock & Record<string, unknown> = { ...s };
  if (include.variant) {
    const v = mockStore.variants.find((item) => item.id === s.variantId);
    const subInclude = typeof include.variant === "object" ? include.variant.include : undefined;
    res.variant = v ? enrichVariant(v, subInclude) : null;
  }
  return res;
}

function enrichOrderItem(
  oi: OrderItem,
  include?: OrderItemInclude | null,
): OrderItem & Record<string, unknown> {
  if (!include) return { ...oi };
  const res: OrderItem & Record<string, unknown> = { ...oi };
  if (include.variant) {
    const v = oi.variantId ? mockStore.variants.find((item) => item.id === oi.variantId) : null;
    const subInclude = typeof include.variant === "object" ? include.variant.include : undefined;
    res.variant = v ? enrichVariant(v, subInclude) : null;
  }
  return res;
}

function enrichOrder(o: Order, include?: OrderInclude | null): Order & Record<string, unknown> {
  if (!include) return { ...o };
  const res: Order & Record<string, unknown> = { ...o };
  if (include.items) {
    const items = mockStore.orderItems.filter((oi) => oi.orderId === o.id);
    const subInclude = typeof include.items === "object" ? include.items.include : undefined;
    res.items = items.map((oi) => enrichOrderItem(oi, subInclude));
  }
  if (include.transactions) {
    res.transactions = mockStore.transactions.filter((t) => t.orderId === o.id);
  }
  if (include._count?.select?.items) {
    const counts = (res._count as Record<string, number> | undefined) || {};
    counts.items = mockStore.orderItems.filter((oi) => oi.orderId === o.id).length;
    res._count = counts;
  }
  return res;
}

// Filter matching logic
function matchesDate(date: Date, filter?: DateFilter | null): boolean {
  if (!filter) return true;
  if (filter.gte && date < new Date(filter.gte)) return false;
  if (filter.lte && date > new Date(filter.lte)) return false;
  if (filter.gt && date <= new Date(filter.gt)) return false;
  if (filter.lt && date >= new Date(filter.lt)) return false;
  return true;
}

// Mock Prisma Implementation
export const mockPrisma = {
  product: {
    async count(args?: Prisma.ProductCountArgs): Promise<number> {
      let list = mockStore.products;
      if (args?.where?.isActive !== undefined) {
        const active = args.where.isActive;
        list = list.filter((p) => (typeof active === "boolean" ? p.isActive === active : true));
      }
      return list.length;
    },
    async findMany(args?: Prisma.ProductFindManyArgs) {
      let list = [...mockStore.products];
      if (args?.where?.isActive !== undefined) {
        const active = args.where.isActive;
        list = list.filter((p) => (typeof active === "boolean" ? p.isActive === active : true));
      }
      if (args?.distinct && Array.isArray(args.distinct) && args.distinct.includes("category")) {
        const seen = new Set<string>();
        list = list.filter((p) => {
          if (seen.has(p.category)) return false;
          seen.add(p.category);
          return true;
        });
      }
      const order = args?.orderBy as { createdAt?: string; updatedAt?: string } | undefined;
      if (order?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (order?.updatedAt === "desc") {
        list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      }
      return list.map((p) => enrichProduct(p, args?.include as ProductInclude));
    },
    async findUnique(args: Prisma.ProductFindUniqueArgs) {
      const id = (args?.where as { id?: string })?.id;
      const p = mockStore.products.find((prod) => prod.id === id);
      if (!p) return null;
      if (args.select) {
        const sel: Record<string, unknown> = {};
        const s = args.select as Record<string, unknown>;
        if (s.id) sel.id = p.id;
        if (s.name) sel.name = p.name;
        if (s.isActive) sel.isActive = p.isActive;
        if (s.reorderLevel) sel.reorderLevel = p.reorderLevel;
        if (s.basePrice) sel.basePrice = p.basePrice;
        if (s.variants) {
          const varSelect = (s.variants as { select?: Record<string, unknown> })?.select;
          const vars = mockStore.variants.filter((v) => v.productId === p.id);
          sel.variants = vars.map((v) => {
            const vRes: Record<string, unknown> = {
              id: v.id,
              size: v.size,
              color: v.color,
              sku: v.sku,
            };
            if (varSelect?.stock) {
              const st = mockStore.stocks.find((stock) => stock.variantId === v.id);
              vRes.stock = st ? { quantity: st.quantity } : null;
            }
            if ((varSelect?._count as { select?: { orderItems?: boolean } })?.select?.orderItems) {
              vRes._count = {
                orderItems: mockStore.orderItems.filter((oi) => oi.variantId === v.id).length,
              };
            }
            return vRes;
          });
        }
        return sel;
      }
      return enrichProduct(p, args?.include as ProductInclude);
    },
    async create(args: Prisma.ProductCreateArgs) {
      const data = args.data as {
        name: string;
        description?: string | null;
        category?: string;
        basePrice: number;
        reorderLevel?: number;
        image?: string | null;
        isActive?: boolean;
        variants?: {
          create?: Array<{
            size: string;
            color: string;
            sku: string;
            image?: string | null;
            priceAdjustment?: number;
            stock?: {
              create?: {
                quantity?: number;
                reorderLevel?: number;
                lastRestocked?: Date | null;
              };
            };
          }>;
        };
      };
      const product: Product = {
        id: generateId("prod"),
        name: data.name,
        description: data.description ?? null,
        category: data.category || "Jersey",
        basePrice: data.basePrice,
        reorderLevel: data.reorderLevel ?? 10,
        image: data.image ?? null,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.products.push(product);

      if (data.variants?.create) {
        for (const vData of data.variants.create) {
          const variant: Variant = {
            id: generateId("var"),
            productId: product.id,
            size: vData.size,
            color: vData.color,
            sku: vData.sku,
            image: vData.image ?? null,
            priceAdjustment: vData.priceAdjustment ?? 0,
            isActive: true,
            archivedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockStore.variants.push(variant);

          if (vData.stock?.create) {
            const stock: InventoryStock = {
              id: generateId("stock"),
              variantId: variant.id,
              quantity: vData.stock.create.quantity ?? 0,
              reorderLevel: vData.stock.create.reorderLevel ?? 10,
              lastRestocked: vData.stock.create.lastRestocked ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockStore.stocks.push(stock);
          }
        }
      }
      return enrichProduct(product, args?.include as ProductInclude);
    },
    async update(args: Prisma.ProductUpdateArgs) {
      const id = (args.where as { id: string }).id;
      const p = mockStore.products.find((prod) => prod.id === id);
      if (!p) throw new Error("Product not found");
      const d = args.data as Partial<Product>;
      if (d.name !== undefined) p.name = d.name;
      if (d.description !== undefined) p.description = d.description;
      if (d.category !== undefined) p.category = d.category;
      if (d.basePrice !== undefined) p.basePrice = d.basePrice;
      if (d.image !== undefined) p.image = d.image;
      if (d.isActive !== undefined) p.isActive = d.isActive;
      p.updatedAt = new Date();
      return enrichProduct(p, args?.include as ProductInclude);
    },
    async delete(args: Prisma.ProductDeleteArgs) {
      const id = (args.where as { id: string }).id;
      const idx = mockStore.products.findIndex((prod) => prod.id === id);
      if (idx === -1) throw new Error("Product not found");
      const deleted = mockStore.products.splice(idx, 1)[0];
      const linkedVarIds = mockStore.variants.filter((v) => v.productId === id).map((v) => v.id);
      mockStore.variants = mockStore.variants.filter((v) => v.productId !== id);
      mockStore.stocks = mockStore.stocks.filter((s) => !linkedVarIds.includes(s.variantId));
      return deleted;
    },
    async deleteMany(): Promise<{ count: number }> {
      mockStore.products = [];
      return { count: 0 };
    },
  },

  variant: {
    async findMany(args?: Prisma.VariantFindManyArgs) {
      let list = [...mockStore.variants];
      if (args?.where) {
        const w = args.where as {
          isActive?: boolean;
          productId?: string;
          product?: { isActive?: boolean };
          id?: { in?: string[] };
        };
        if (w.isActive !== undefined) list = list.filter((v) => v.isActive === w.isActive);
        if (w.productId) list = list.filter((v) => v.productId === w.productId);
        if (w.product?.isActive !== undefined) {
          list = list.filter((v) => {
            const p = mockStore.products.find((prod) => prod.id === v.productId);
            return p && p.isActive === w.product?.isActive;
          });
        }
        if (w.id?.in) {
          const inList = w.id.in;
          list = list.filter((v) => inList.includes(v.id));
        }
      }
      if (Array.isArray(args?.orderBy)) {
        const orders = args.orderBy as Array<{ archivedAt?: string; updatedAt?: string }>;
        list.sort((a, b) => {
          for (const orderItem of orders) {
            if (orderItem.archivedAt === "desc") {
              const tA = a.archivedAt ? a.archivedAt.getTime() : 0;
              const tB = b.archivedAt ? b.archivedAt.getTime() : 0;
              if (tA !== tB) return tB - tA;
            }
            if (orderItem.updatedAt === "desc") {
              if (a.updatedAt.getTime() !== b.updatedAt.getTime())
                return b.updatedAt.getTime() - a.updatedAt.getTime();
            }
          }
          return 0;
        });
      }
      return list.map((v) => enrichVariant(v, args?.include as VariantInclude));
    },
    async findUnique(args: Prisma.VariantFindUniqueArgs) {
      const id = (args?.where as { id?: string })?.id;
      const v = mockStore.variants.find((varItem) => varItem.id === id);
      if (!v) return null;
      if (args.select) {
        const sel: Record<string, unknown> = {};
        const s = args.select as Record<string, unknown>;
        if (s.id) sel.id = v.id;
        if (s.productId) sel.productId = v.productId;
        return sel;
      }
      return enrichVariant(v, args?.include as VariantInclude);
    },
    async create(args: Prisma.VariantCreateArgs) {
      const d = args.data as {
        productId: string;
        size: string;
        color: string;
        sku: string;
        image?: string | null;
        priceAdjustment?: number;
      };
      const variant: Variant = {
        id: generateId("var"),
        productId: d.productId,
        size: d.size,
        color: d.color,
        sku: d.sku,
        image: d.image ?? null,
        priceAdjustment: d.priceAdjustment ?? 0,
        isActive: true,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.variants.push(variant);
      return enrichVariant(variant, args?.include as VariantInclude);
    },
    async update(args: Prisma.VariantUpdateArgs) {
      const id = (args.where as { id: string }).id;
      const v = mockStore.variants.find((varItem) => varItem.id === id);
      if (!v) throw new Error("Variant not found");
      const d = args.data as Partial<Variant>;
      if (d.size !== undefined) v.size = d.size;
      if (d.color !== undefined) v.color = d.color;
      if (d.sku !== undefined) v.sku = d.sku;
      if (d.image !== undefined) v.image = d.image;
      if (d.priceAdjustment !== undefined) v.priceAdjustment = d.priceAdjustment;
      if (d.isActive !== undefined) v.isActive = d.isActive;
      if (d.archivedAt !== undefined) v.archivedAt = d.archivedAt;
      v.updatedAt = new Date();
      return enrichVariant(v, args?.include as VariantInclude);
    },
    async updateMany(args: Prisma.VariantUpdateManyArgs): Promise<{ count: number }> {
      const where = args.where as { productId?: string; archivedAt?: Date | null } | undefined;
      const data = args.data as Partial<Variant>;
      let matches = mockStore.variants;
      if (where?.productId) matches = matches.filter((v) => v.productId === where.productId);
      if (where?.archivedAt === null) matches = matches.filter((v) => v.archivedAt === null);

      let count = 0;
      for (const v of matches) {
        if (data.isActive !== undefined) v.isActive = data.isActive;
        if (data.archivedAt !== undefined) v.archivedAt = data.archivedAt;
        v.updatedAt = new Date();
        count++;
      }
      return { count };
    },
    async delete(args: Prisma.VariantDeleteArgs): Promise<Variant> {
      const id = (args.where as { id: string }).id;
      const idx = mockStore.variants.findIndex((v) => v.id === id);
      if (idx === -1) throw new Error("Variant not found");
      const deleted = mockStore.variants.splice(idx, 1)[0];
      mockStore.stocks = mockStore.stocks.filter((s) => s.variantId !== id);
      return deleted;
    },
    async deleteMany(): Promise<{ count: number }> {
      mockStore.variants = [];
      return { count: 0 };
    },
  },

  inventoryStock: {
    async count(args?: Prisma.InventoryStockCountArgs): Promise<number> {
      return mockStore.stocks.length;
    },
    async findMany(args?: Prisma.InventoryStockFindManyArgs) {
      let list = [...mockStore.stocks];
      if (args?.where) {
        const vw = (
          args.where as { variant?: { isActive?: boolean; product?: { isActive?: boolean } } }
        )?.variant;
        if (vw) {
          list = list.filter((s) => {
            const v = mockStore.variants.find((item) => item.id === s.variantId);
            if (!v) return false;
            if (vw.isActive !== undefined && v.isActive !== vw.isActive) return false;
            if (vw.product?.isActive !== undefined) {
              const p = mockStore.products.find((prod) => prod.id === v.productId);
              if (!p || p.isActive !== vw.product.isActive) return false;
            }
            return true;
          });
        }
      }
      const order = args?.orderBy as { variant?: { product?: { name?: string } } } | undefined;
      if (order?.variant?.product?.name === "asc") {
        list.sort((a, b) => {
          const vA = mockStore.variants.find((v) => v.id === a.variantId);
          const vB = mockStore.variants.find((v) => v.id === b.variantId);
          const pA = vA ? mockStore.products.find((p) => p.id === vA.productId) : null;
          const pB = vB ? mockStore.products.find((p) => p.id === vB.productId) : null;
          return (pA?.name || "").localeCompare(pB?.name || "");
        });
      }
      if (args?.select) {
        return list.map((s) => ({ quantity: s.quantity, reorderLevel: s.reorderLevel }));
      }
      return list.map((s) => enrichStock(s, args?.include as StockInclude));
    },
    async findUnique(args: Prisma.InventoryStockFindUniqueArgs) {
      const vId = (args?.where as { variantId?: string })?.variantId;
      const s = mockStore.stocks.find((stock) => stock.variantId === vId);
      if (!s) return null;
      return enrichStock(s, args?.include as StockInclude);
    },
    async create(args: Prisma.InventoryStockCreateArgs) {
      const d = args.data as {
        variantId: string;
        quantity?: number;
        reorderLevel?: number;
        lastRestocked?: Date | null;
      };
      const stock: InventoryStock = {
        id: generateId("stock"),
        variantId: d.variantId,
        quantity: d.quantity ?? 0,
        reorderLevel: d.reorderLevel ?? 10,
        lastRestocked: d.lastRestocked ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.stocks.push(stock);
      return enrichStock(stock, args?.include as StockInclude);
    },
    async update(args: Prisma.InventoryStockUpdateArgs) {
      const vId = (args.where as { variantId: string }).variantId;
      const s = mockStore.stocks.find((stock) => stock.variantId === vId);
      if (!s) throw new Error("Stock not found");
      const d = args.data as Partial<InventoryStock>;
      if (d.quantity !== undefined) s.quantity = d.quantity;
      if (d.lastRestocked !== undefined) s.lastRestocked = d.lastRestocked;
      s.updatedAt = new Date();
      return enrichStock(s, args?.include as StockInclude);
    },
    async updateMany(args: Prisma.InventoryStockUpdateManyArgs): Promise<{ count: number }> {
      const where = args.where as { variantId?: string; quantity?: { gte?: number } } | undefined;
      const data = args.data as { quantity?: { decrement?: number; increment?: number } };
      const vId = where?.variantId;
      const stock = mockStore.stocks.find((s) => s.variantId === vId);
      if (!stock) return { count: 0 };

      if (where?.quantity?.gte !== undefined) {
        if (stock.quantity < where.quantity.gte) return { count: 0 };
      }

      if (data.quantity?.decrement !== undefined) {
        stock.quantity -= data.quantity.decrement;
      }
      if (data.quantity?.increment !== undefined) {
        stock.quantity += data.quantity.increment;
      }
      stock.updatedAt = new Date();
      return { count: 1 };
    },
    async deleteMany(): Promise<{ count: number }> {
      mockStore.stocks = [];
      return { count: 0 };
    },
  },

  order: {
    async count(args?: Prisma.OrderCountArgs): Promise<number> {
      let list = mockStore.orders;
      if (args?.where) {
        const w = args.where as {
          status?: string | { in?: string[] };
          items?: {
            some?: {
              variantId?: string;
              productIdSnapshot?: string;
              OR?: Array<{
                productIdSnapshot?: string;
                variant?: { is?: { productId?: string } };
              }>;
            };
          };
        };
        if (w.status) {
          if (typeof w.status === "string") {
            list = list.filter((o) => o.status === w.status);
          } else if (w.status.in) {
            const inList = w.status.in;
            list = list.filter((o) => inList.includes(o.status));
          }
        }
        if (w.items?.some) {
          const itemWhere = w.items.some;
          list = list.filter((o) => {
            const items = mockStore.orderItems.filter((oi) => oi.orderId === o.id);
            return items.some((oi) => {
              if (itemWhere.variantId && oi.variantId !== itemWhere.variantId) return false;
              if (
                itemWhere.productIdSnapshot &&
                oi.productIdSnapshot !== itemWhere.productIdSnapshot
              )
                return false;
              if (itemWhere.OR) {
                const orMatch = itemWhere.OR.some((cond) => {
                  if (cond.productIdSnapshot && oi.productIdSnapshot === cond.productIdSnapshot)
                    return true;
                  if (cond.variant?.is?.productId) {
                    const v = oi.variantId
                      ? mockStore.variants.find((varItem) => varItem.id === oi.variantId)
                      : null;
                    return v?.productId === cond.variant.is.productId;
                  }
                  return false;
                });
                if (!orMatch) return false;
              }
              return true;
            });
          });
        }
      }
      return list.length;
    },
    async findMany(args?: Prisma.OrderFindManyArgs) {
      let list = [...mockStore.orders];
      if (args?.where) {
        const w = args.where as { createdAt?: DateFilter };
        if (w.createdAt) {
          list = list.filter((o) => matchesDate(o.createdAt, w.createdAt));
        }
      }
      const order = args?.orderBy as { createdAt?: string } | undefined;
      if (order?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (args?.take) {
        list = list.slice(0, args.take);
      }
      return list.map((o) => enrichOrder(o, args?.include as OrderInclude));
    },
    async findUnique(args: Prisma.OrderFindUniqueArgs) {
      const id = (args?.where as { id?: string })?.id;
      const o = mockStore.orders.find((ord) => ord.id === id);
      if (!o) return null;
      return enrichOrder(o, args?.include as OrderInclude);
    },
    async create(args: Prisma.OrderCreateArgs) {
      const d = args.data as {
        customerName: string;
        customerEmail?: string | null;
        customerPhone?: string | null;
        status?: OrderStatus;
        salesChannel?: SalesChannel;
        channelFee?: number;
        totalAmount: number;
        netAmount?: number;
        notes?: string | null;
        createdAt?: Date | string;
        updatedAt?: Date | string;
        items?: {
          create?: Array<{
            productIdSnapshot?: string | null;
            productNameSnapshot?: string | null;
            variantId?: string | null;
            quantity: number;
            unitPrice: number;
            adjustedPrice?: number | null;
            subtotal: number;
            variantName?: string | null;
            variantSku?: string | null;
            variantSize?: string | null;
            variantColor?: string | null;
            createdAt?: Date | string;
          }>;
        };
        transactions?: {
          create?: {
            amount: number;
            type?: TransactionType;
            method?: PaymentMethod;
            reference?: string | null;
          };
        };
      };
      const order: Order = {
        id: generateId("ord"),
        customerName: d.customerName,
        customerEmail: d.customerEmail ?? null,
        customerPhone: d.customerPhone ?? null,
        status: d.status ?? "PENDING",
        salesChannel: d.salesChannel ?? "DIRECT",
        channelFee: d.channelFee ?? 0,
        totalAmount: d.totalAmount,
        netAmount: d.netAmount ?? d.totalAmount,
        notes: d.notes ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
      };
      mockStore.orders.push(order);

      if (d.items?.create) {
        for (const iData of d.items.create) {
          const item: OrderItem = {
            id: generateId("oi"),
            orderId: order.id,
            productIdSnapshot: iData.productIdSnapshot ?? null,
            productNameSnapshot: iData.productNameSnapshot ?? null,
            variantId: iData.variantId ?? null,
            quantity: iData.quantity,
            unitPrice: iData.unitPrice,
            adjustedPrice: iData.adjustedPrice ?? null,
            subtotal: iData.subtotal,
            variantName: iData.variantName ?? null,
            variantSku: iData.variantSku ?? null,
            variantSize: iData.variantSize ?? null,
            variantColor: iData.variantColor ?? null,
            createdAt: iData.createdAt ? new Date(iData.createdAt) : order.createdAt,
          };
          mockStore.orderItems.push(item);
        }
      }

      if (d.transactions?.create) {
        const txData = d.transactions.create;
        const tx: Transaction = {
          id: generateId("tx"),
          orderId: order.id,
          amount: txData.amount,
          type: txData.type ?? "PAYMENT",
          method: txData.method ?? "CASH",
          reference: txData.reference ?? null,
          createdAt: order.createdAt,
        };
        mockStore.transactions.push(tx);
      }

      return enrichOrder(order, args?.include as OrderInclude);
    },
    async update(args: Prisma.OrderUpdateArgs) {
      const id = (args.where as { id: string }).id;
      const o = mockStore.orders.find((ord) => ord.id === id);
      if (!o) throw new Error("Order not found");
      const d = args.data as Partial<Order> & {
        items?: {
          create?: Array<{
            productIdSnapshot?: string | null;
            productNameSnapshot?: string | null;
            variantId?: string | null;
            quantity: number;
            unitPrice: number;
            adjustedPrice?: number | null;
            subtotal: number;
            variantName?: string | null;
            variantSku?: string | null;
            variantSize?: string | null;
            variantColor?: string | null;
          }>;
        };
      };
      if (d.customerName !== undefined) o.customerName = d.customerName;
      if (d.customerEmail !== undefined) o.customerEmail = d.customerEmail;
      if (d.customerPhone !== undefined) o.customerPhone = d.customerPhone;
      if (d.notes !== undefined) o.notes = d.notes;
      if (d.salesChannel !== undefined) o.salesChannel = d.salesChannel;
      if (d.status !== undefined) o.status = d.status;
      if (d.channelFee !== undefined) o.channelFee = d.channelFee;
      if (d.totalAmount !== undefined) o.totalAmount = d.totalAmount;
      if (d.netAmount !== undefined) o.netAmount = d.netAmount;
      o.updatedAt = new Date();

      if (d.items?.create) {
        for (const iData of d.items.create) {
          const item: OrderItem = {
            id: generateId("oi"),
            orderId: o.id,
            productIdSnapshot: iData.productIdSnapshot ?? null,
            productNameSnapshot: iData.productNameSnapshot ?? null,
            variantId: iData.variantId ?? null,
            quantity: iData.quantity,
            unitPrice: iData.unitPrice,
            adjustedPrice: iData.adjustedPrice ?? null,
            subtotal: iData.subtotal,
            variantName: iData.variantName ?? null,
            variantSku: iData.variantSku ?? null,
            variantSize: iData.variantSize ?? null,
            variantColor: iData.variantColor ?? null,
            createdAt: new Date(),
          };
          mockStore.orderItems.push(item);
        }
      }

      return enrichOrder(o, args?.include as OrderInclude);
    },
    async delete(args: Prisma.OrderDeleteArgs) {
      const id = (args.where as { id: string }).id;
      const idx = mockStore.orders.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error("Order not found");
      const deleted = mockStore.orders.splice(idx, 1)[0];
      mockStore.orderItems = mockStore.orderItems.filter((oi) => oi.orderId !== id);
      mockStore.transactions = mockStore.transactions.filter((t) => t.orderId !== id);
      return deleted;
    },
    async deleteMany(): Promise<{ count: number }> {
      mockStore.orders = [];
      return { count: 0 };
    },
    async groupBy(args: Prisma.OrderGroupByArgs) {
      let list = mockStore.orders;
      const w = args?.where as { createdAt?: DateFilter } | undefined;
      if (w?.createdAt) {
        list = list.filter((o) => matchesDate(o.createdAt, w.createdAt));
      }
      const counts = new Map<string, number>();
      for (const o of list) {
        counts.set(o.status, (counts.get(o.status) || 0) + 1);
      }
      return [...counts.entries()].map(([status, count]) => ({
        status,
        _count: { _all: count },
      }));
    },
  },

  orderItem: {
    async count(args?: Prisma.OrderItemCountArgs): Promise<number> {
      let list = mockStore.orderItems;
      const w = args?.where as
        | {
            variantId?: string;
            OR?: Array<{
              productIdSnapshot?: string;
              variant?: { is?: { productId?: string } };
            }>;
          }
        | undefined;
      if (w?.variantId) {
        list = list.filter((oi) => oi.variantId === w.variantId);
      }
      if (w?.OR) {
        const orConditions = w.OR;
        list = list.filter((oi) => {
          return orConditions.some((cond) => {
            if (cond.productIdSnapshot && oi.productIdSnapshot === cond.productIdSnapshot)
              return true;
            if (cond.variant?.is?.productId) {
              const v = oi.variantId
                ? mockStore.variants.find((varItem) => varItem.id === oi.variantId)
                : null;
              return v?.productId === cond.variant.is.productId;
            }
            return false;
          });
        });
      }
      return list.length;
    },
    async findMany(args?: Prisma.OrderItemFindManyArgs) {
      let list = [...mockStore.orderItems];
      const w = args?.where as
        { order?: { status?: { not?: string }; createdAt?: DateFilter } } | undefined;
      if (w?.order) {
        const ow = w.order;
        list = list.filter((oi) => {
          const o = mockStore.orders.find((ord) => ord.id === oi.orderId);
          if (!o) return false;
          if (ow.status?.not && o.status === ow.status.not) return false;
          if (ow.createdAt && !matchesDate(o.createdAt, ow.createdAt)) return false;
          return true;
        });
      }
      return list.map((oi) => enrichOrderItem(oi, args?.include as OrderItemInclude));
    },
    async deleteMany(args?: Prisma.OrderItemDeleteManyArgs): Promise<{ count: number }> {
      const oId = (args?.where as { orderId?: string } | undefined)?.orderId;
      if (oId) {
        const initial = mockStore.orderItems.length;
        mockStore.orderItems = mockStore.orderItems.filter((oi) => oi.orderId !== oId);
        return { count: initial - mockStore.orderItems.length };
      }
      mockStore.orderItems = [];
      return { count: 0 };
    },
    async updateMany(): Promise<{ count: number }> {
      return { count: 0 };
    },
  },

  transaction: {
    async findFirst(args?: Prisma.TransactionFindFirstArgs) {
      const ref = (args?.where as { reference?: { equals?: string } } | undefined)?.reference
        ?.equals;
      if (!ref) return null;
      const t = mockStore.transactions.find(
        (tx) => tx.reference?.toLowerCase() === ref.toLowerCase(),
      );
      if (!t) return null;
      if (args?.select) return { id: t.id };
      return t;
    },
    async findMany(args?: Prisma.TransactionFindManyArgs) {
      let list = [...mockStore.transactions];
      const w = args?.where as { type?: TransactionType; createdAt?: DateFilter } | undefined;
      if (w) {
        if (w.type) list = list.filter((t) => t.type === w.type);
        if (w.createdAt) list = list.filter((t) => matchesDate(t.createdAt, w.createdAt));
      }
      return list;
    },
    async create(args: Prisma.TransactionCreateArgs) {
      const d = args.data as {
        orderId: string;
        amount: number;
        type?: TransactionType;
        method?: PaymentMethod;
        reference?: string | null;
        createdAt?: Date | string;
      };
      const tx: Transaction = {
        id: generateId("tx"),
        orderId: d.orderId,
        amount: d.amount,
        type: d.type ?? "PAYMENT",
        method: d.method ?? "CASH",
        reference: d.reference ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
      };
      mockStore.transactions.push(tx);
      return tx;
    },
    async update(args: Prisma.TransactionUpdateArgs) {
      const id = (args.where as { id: string }).id;
      const t = mockStore.transactions.find((tx) => tx.id === id);
      if (!t) throw new Error("Transaction not found");
      const d = args.data as Partial<Transaction>;
      if (d.method !== undefined) t.method = d.method;
      if (d.reference !== undefined) t.reference = d.reference;
      return t;
    },
    async deleteMany(): Promise<{ count: number }> {
      mockStore.transactions = [];
      return { count: 0 };
    },
    async aggregate(args?: Prisma.TransactionAggregateArgs) {
      let list = mockStore.transactions;
      const w = args?.where as { type?: TransactionType; createdAt?: DateFilter } | undefined;
      if (w) {
        if (w.type) list = list.filter((t) => t.type === w.type);
        if (w.createdAt) list = list.filter((t) => matchesDate(t.createdAt, w.createdAt));
      }
      const sum = list.reduce((acc, t) => acc + t.amount, 0);
      return { _sum: { amount: sum } };
    },
    async groupBy(args: Prisma.TransactionGroupByArgs) {
      let list = mockStore.transactions;
      const w = args?.where as { type?: TransactionType; createdAt?: DateFilter } | undefined;
      if (w) {
        if (w.type) list = list.filter((t) => t.type === w.type);
        if (w.createdAt) list = list.filter((t) => matchesDate(t.createdAt, w.createdAt));
      }
      const groups = new Map<string, { count: number; amount: number }>();
      for (const t of list) {
        const entry = groups.get(t.method) || { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += t.amount;
        groups.set(t.method, entry);
      }
      return [...groups.entries()].map(([method, data]) => ({
        method,
        _count: { _all: data.count },
        _sum: { amount: data.amount },
      }));
    },
  },

  user: {
    async findUnique(args: Prisma.UserFindUniqueArgs): Promise<User | null> {
      const email = (args?.where as { email?: string })?.email;
      if (!email) return null;
      return mockStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    async deleteMany(): Promise<{ count: number }> {
      mockStore.users = [];
      return { count: 0 };
    },
  },

  async $transaction<T>(fn: ((tx: PrismaClient) => Promise<T>) | Promise<T>[]): Promise<T | T[]> {
    if (typeof fn === "function") {
      return fn(mockPrisma as unknown as PrismaClient);
    }
    return Promise.all(fn);
  },
};

export const prisma: PrismaClient = mockPrisma as unknown as PrismaClient;
