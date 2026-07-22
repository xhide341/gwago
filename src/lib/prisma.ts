import "dotenv/config";
import { mockStore, Product, Variant, InventoryStock, Order, OrderItem, Transaction, User } from "./mock-store";

// Re-export all types/enums from generated client for type safety
export * from "../generated/client";

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Helpers for enriching records with `include` / `select` ───
function enrichProduct(p: Product, include?: any) {
  if (!include) return p;
  const res: any = { ...p };
  if (include.variants) {
    let vars = mockStore.variants.filter((v) => v.productId === p.id);
    if (include.variants.where) {
      const w = include.variants.where;
      if (w.isActive !== undefined) vars = vars.filter((v) => v.isActive === w.isActive);
    }
    if (include.variants.orderBy?.createdAt === "asc") {
      vars.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    res.variants = vars.map((v) => enrichVariant(v, include.variants.include));
  }
  if (include._count?.select?.variants) {
    res._count = res._count || {};
    res._count.variants = mockStore.variants.filter((v) => v.productId === p.id).length;
  }
  return res;
}

function enrichVariant(v: Variant, include?: any) {
  if (!include) return v;
  const res: any = { ...v };
  if (include.product) {
    const prod = mockStore.products.find((p) => p.id === v.productId);
    res.product = prod ? enrichProduct(prod, include.product.include) : null;
  }
  if (include.stock) {
    res.stock = mockStore.stocks.find((s) => s.variantId === v.id) || null;
  }
  if (include._count?.select?.orderItems) {
    res._count = res._count || {};
    res._count.orderItems = mockStore.orderItems.filter((oi) => oi.variantId === v.id).length;
  }
  return res;
}

function enrichStock(s: InventoryStock, include?: any) {
  if (!include) return s;
  const res: any = { ...s };
  if (include.variant) {
    const v = mockStore.variants.find((v) => v.id === s.variantId);
    res.variant = v ? enrichVariant(v, include.variant.include) : null;
  }
  return res;
}

function enrichOrderItem(oi: OrderItem, include?: any) {
  if (!include) return oi;
  const res: any = { ...oi };
  if (include.variant) {
    const v = oi.variantId ? mockStore.variants.find((v) => v.id === oi.variantId) : null;
    res.variant = v ? enrichVariant(v, include.variant.include) : null;
  }
  return res;
}

function enrichOrder(o: Order, include?: any) {
  if (!include) return o;
  const res: any = { ...o };
  if (include.items) {
    const items = mockStore.orderItems.filter((oi) => oi.orderId === o.id);
    res.items = items.map((oi) => enrichOrderItem(oi, include.items.include));
  }
  if (include.transactions) {
    res.transactions = mockStore.transactions.filter((t) => t.orderId === o.id);
  }
  if (include._count?.select?.items) {
    res._count = res._count || {};
    res._count.items = mockStore.orderItems.filter((oi) => oi.orderId === o.id).length;
  }
  return res;
}

// ─── Filter matching logic ───
function matchesDate(date: Date, filter: any) {
  if (!filter) return true;
  if (filter.gte && date < new Date(filter.gte)) return false;
  if (filter.lte && date > new Date(filter.lte)) return false;
  return true;
}

// ─── Mock Prisma Implementation ───
export const mockPrisma: any = {
  product: {
    async count(args?: any) {
      let list = mockStore.products;
      if (args?.where?.isActive !== undefined) {
        list = list.filter((p) => p.isActive === args.where.isActive);
      }
      return list.length;
    },
    async findMany(args?: any) {
      let list = [...mockStore.products];
      if (args?.where?.isActive !== undefined) {
        list = list.filter((p) => p.isActive === args.where.isActive);
      }
      if (args?.distinct?.includes("category")) {
        const seen = new Set<string>();
        list = list.filter((p) => {
          if (seen.has(p.category)) return false;
          seen.add(p.category);
          return true;
        });
      }
      if (args?.orderBy?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (args?.orderBy?.updatedAt === "desc") {
        list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      }
      return list.map((p) => enrichProduct(p, args?.include));
    },
    async findUnique(args: any) {
      const id = args?.where?.id;
      const p = mockStore.products.find((prod) => prod.id === id);
      if (!p) return null;
      if (args.select) {
        const sel: any = {};
        if (args.select.id) sel.id = p.id;
        if (args.select.name) sel.name = p.name;
        if (args.select.isActive) sel.isActive = p.isActive;
        if (args.select.reorderLevel) sel.reorderLevel = p.reorderLevel;
        if (args.select.basePrice) sel.basePrice = p.basePrice;
        if (args.select.variants) {
          const vars = mockStore.variants.filter((v) => v.productId === p.id);
          sel.variants = vars.map((v) => {
            const vRes: any = { id: v.id, size: v.size, color: v.color, sku: v.sku };
            if (args.select.variants.select?.stock) {
              const st = mockStore.stocks.find((s) => s.variantId === v.id);
              vRes.stock = st ? { quantity: st.quantity } : null;
            }
            if (args.select.variants.select?._count?.select?.orderItems) {
              vRes._count = {
                orderItems: mockStore.orderItems.filter((oi) => oi.variantId === v.id).length,
              };
            }
            return vRes;
          });
        }
        return sel;
      }
      return enrichProduct(p, args?.include);
    },
    async create(args: any) {
      const data = args.data;
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
      return enrichProduct(product, args?.include);
    },
    async update(args: any) {
      const id = args.where.id;
      const p = mockStore.products.find((prod) => prod.id === id);
      if (!p) throw new Error("Product not found");
      const d = args.data;
      if (d.name !== undefined) p.name = d.name;
      if (d.description !== undefined) p.description = d.description;
      if (d.category !== undefined) p.category = d.category;
      if (d.basePrice !== undefined) p.basePrice = d.basePrice;
      if (d.image !== undefined) p.image = d.image;
      if (d.isActive !== undefined) p.isActive = d.isActive;
      p.updatedAt = new Date();
      return enrichProduct(p, args?.include);
    },
    async delete(args: any) {
      const id = args.where.id;
      const idx = mockStore.products.findIndex((prod) => prod.id === id);
      if (idx === -1) throw new Error("Product not found");
      const deleted = mockStore.products.splice(idx, 1)[0];
      // delete linked variants
      const linkedVarIds = mockStore.variants.filter((v) => v.productId === id).map((v) => v.id);
      mockStore.variants = mockStore.variants.filter((v) => v.productId !== id);
      mockStore.stocks = mockStore.stocks.filter((s) => !linkedVarIds.includes(s.variantId));
      return deleted;
    },
    async deleteMany() {
      mockStore.products = [];
      return { count: 0 };
    },
  },

  variant: {
    async findMany(args?: any) {
      let list = [...mockStore.variants];
      if (args?.where) {
        const w = args.where;
        if (w.isActive !== undefined) list = list.filter((v) => v.isActive === w.isActive);
        if (w.productId) list = list.filter((v) => v.productId === w.productId);
        if (w.product?.isActive !== undefined) {
          list = list.filter((v) => {
            const p = mockStore.products.find((prod) => prod.id === v.productId);
            return p && p.isActive === w.product.isActive;
          });
        }
        if (w.id?.in) {
          list = list.filter((v) => w.id.in.includes(v.id));
        }
      }
      if (Array.isArray(args?.orderBy)) {
        list.sort((a, b) => {
          for (const orderItem of args.orderBy) {
            if (orderItem.archivedAt === "desc") {
              const tA = a.archivedAt ? a.archivedAt.getTime() : 0;
              const tB = b.archivedAt ? b.archivedAt.getTime() : 0;
              if (tA !== tB) return tB - tA;
            }
            if (orderItem.updatedAt === "desc") {
              if (a.updatedAt.getTime() !== b.updatedAt.getTime()) return b.updatedAt.getTime() - a.updatedAt.getTime();
            }
          }
          return 0;
        });
      }
      return list.map((v) => enrichVariant(v, args?.include));
    },
    async findUnique(args: any) {
      const id = args?.where?.id;
      const v = mockStore.variants.find((varItem) => varItem.id === id);
      if (!v) return null;
      if (args.select) {
        const sel: any = {};
        if (args.select.id) sel.id = v.id;
        if (args.select.productId) sel.productId = v.productId;
        return sel;
      }
      return enrichVariant(v, args?.include);
    },
    async create(args: any) {
      const d = args.data;
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
      return enrichVariant(variant, args?.include);
    },
    async update(args: any) {
      const id = args.where.id;
      const v = mockStore.variants.find((varItem) => varItem.id === id);
      if (!v) throw new Error("Variant not found");
      const d = args.data;
      if (d.size !== undefined) v.size = d.size;
      if (d.color !== undefined) v.color = d.color;
      if (d.sku !== undefined) v.sku = d.sku;
      if (d.image !== undefined) v.image = d.image;
      if (d.priceAdjustment !== undefined) v.priceAdjustment = d.priceAdjustment;
      if (d.isActive !== undefined) v.isActive = d.isActive;
      if (d.archivedAt !== undefined) v.archivedAt = d.archivedAt;
      v.updatedAt = new Date();
      return enrichVariant(v, args?.include);
    },
    async updateMany(args: any) {
      const { where, data } = args;
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
    async delete(args: any) {
      const id = args.where.id;
      const idx = mockStore.variants.findIndex((v) => v.id === id);
      if (idx === -1) throw new Error("Variant not found");
      const deleted = mockStore.variants.splice(idx, 1)[0];
      mockStore.stocks = mockStore.stocks.filter((s) => s.variantId !== id);
      return deleted;
    },
    async deleteMany() {
      mockStore.variants = [];
      return { count: 0 };
    },
  },

  inventoryStock: {
    async count(args?: any) {
      return mockStore.stocks.length;
    },
    async findMany(args?: any) {
      let list = [...mockStore.stocks];
      if (args?.where?.variant) {
        const vw = args.where.variant;
        list = list.filter((s) => {
          const v = mockStore.variants.find((v) => v.id === s.variantId);
          if (!v) return false;
          if (vw.isActive !== undefined && v.isActive !== vw.isActive) return false;
          if (vw.product?.isActive !== undefined) {
            const p = mockStore.products.find((p) => p.id === v.productId);
            if (!p || p.isActive !== vw.product.isActive) return false;
          }
          return true;
        });
      }
      if (args?.orderBy?.variant?.product?.name === "asc") {
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
      return list.map((s) => enrichStock(s, args?.include));
    },
    async findUnique(args: any) {
      const vId = args?.where?.variantId;
      const s = mockStore.stocks.find((stock) => stock.variantId === vId);
      if (!s) return null;
      return enrichStock(s, args?.include);
    },
    async create(args: any) {
      const d = args.data;
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
      return enrichStock(stock, args?.include);
    },
    async update(args: any) {
      const vId = args.where.variantId;
      const s = mockStore.stocks.find((stock) => stock.variantId === vId);
      if (!s) throw new Error("Stock not found");
      const d = args.data;
      if (d.quantity !== undefined) s.quantity = d.quantity;
      if (d.lastRestocked !== undefined) s.lastRestocked = d.lastRestocked;
      s.updatedAt = new Date();
      return enrichStock(s, args?.include);
    },
    async updateMany(args: any) {
      const { where, data } = args;
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
    async deleteMany() {
      mockStore.stocks = [];
      return { count: 0 };
    },
  },

  order: {
    async count(args?: any) {
      let list = mockStore.orders;
      if (args?.where) {
        const w = args.where;
        if (w.status) {
          if (typeof w.status === "string") {
            list = list.filter((o) => o.status === w.status);
          } else if (w.status.in) {
            list = list.filter((o) => w.status.in.includes(o.status));
          }
        }
        if (w.items?.some) {
          const itemWhere = w.items.some;
          list = list.filter((o) => {
            const items = mockStore.orderItems.filter((oi) => oi.orderId === o.id);
            return items.some((oi) => {
              if (itemWhere.variantId && oi.variantId !== itemWhere.variantId) return false;
              if (itemWhere.productIdSnapshot && oi.productIdSnapshot !== itemWhere.productIdSnapshot) return false;
              if (itemWhere.OR) {
                const orMatch = itemWhere.OR.some((cond: any) => {
                  if (cond.productIdSnapshot && oi.productIdSnapshot === cond.productIdSnapshot) return true;
                  if (cond.variant?.is?.productId) {
                    const v = oi.variantId ? mockStore.variants.find((varItem) => varItem.id === oi.variantId) : null;
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
    async findMany(args?: any) {
      let list = [...mockStore.orders];
      if (args?.where) {
        const w = args.where;
        if (w.createdAt) {
          list = list.filter((o) => matchesDate(o.createdAt, w.createdAt));
        }
      }
      if (args?.orderBy?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (args?.take) {
        list = list.slice(0, args.take);
      }
      return list.map((o) => enrichOrder(o, args?.include));
    },
    async findUnique(args: any) {
      const id = args?.where?.id;
      const o = mockStore.orders.find((ord) => ord.id === id);
      if (!o) return null;
      return enrichOrder(o, args?.include);
    },
    async create(args: any) {
      const d = args.data;
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

      return enrichOrder(order, args?.include);
    },
    async update(args: any) {
      const id = args.where.id;
      const o = mockStore.orders.find((ord) => ord.id === id);
      if (!o) throw new Error("Order not found");
      const d = args.data;
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

      return enrichOrder(o, args?.include);
    },
    async delete(args: any) {
      const id = args.where.id;
      const idx = mockStore.orders.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error("Order not found");
      const deleted = mockStore.orders.splice(idx, 1)[0];
      mockStore.orderItems = mockStore.orderItems.filter((oi) => oi.orderId !== id);
      mockStore.transactions = mockStore.transactions.filter((t) => t.orderId !== id);
      return deleted;
    },
    async deleteMany() {
      mockStore.orders = [];
      return { count: 0 };
    },
    async groupBy(args: any) {
      let list = mockStore.orders;
      if (args?.where?.createdAt) {
        list = list.filter((o) => matchesDate(o.createdAt, args.where.createdAt));
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
    async count(args?: any) {
      let list = mockStore.orderItems;
      if (args?.where?.variantId) {
        list = list.filter((oi) => oi.variantId === args.where.variantId);
      }
      if (args?.where?.OR) {
        list = list.filter((oi) => {
          return args.where.OR.some((cond: any) => {
            if (cond.productIdSnapshot && oi.productIdSnapshot === cond.productIdSnapshot) return true;
            if (cond.variant?.is?.productId) {
              const v = oi.variantId ? mockStore.variants.find((varItem) => varItem.id === oi.variantId) : null;
              return v?.productId === cond.variant.is.productId;
            }
            return false;
          });
        });
      }
      return list.length;
    },
    async findMany(args?: any) {
      let list = [...mockStore.orderItems];
      if (args?.where?.order) {
        const ow = args.where.order;
        list = list.filter((oi) => {
          const o = mockStore.orders.find((ord) => ord.id === oi.orderId);
          if (!o) return false;
          if (ow.status?.not && o.status === ow.status.not) return false;
          if (ow.createdAt && !matchesDate(o.createdAt, ow.createdAt)) return false;
          return true;
        });
      }
      return list.map((oi) => enrichOrderItem(oi, args?.include));
    },
    async deleteMany(args: any) {
      const oId = args?.where?.orderId;
      if (oId) {
        const initial = mockStore.orderItems.length;
        mockStore.orderItems = mockStore.orderItems.filter((oi) => oi.orderId !== oId);
        return { count: initial - mockStore.orderItems.length };
      }
      mockStore.orderItems = [];
      return { count: 0 };
    },
    async updateMany() {
      return { count: 0 };
    },
  },

  transaction: {
    async findFirst(args?: any) {
      const ref = args?.where?.reference?.equals;
      if (!ref) return null;
      const t = mockStore.transactions.find(
        (tx) => tx.reference?.toLowerCase() === ref.toLowerCase()
      );
      if (!t) return null;
      if (args.select) return { id: t.id };
      return t;
    },
    async findMany(args?: any) {
      let list = [...mockStore.transactions];
      if (args?.where) {
        const w = args.where;
        if (w.type) list = list.filter((t) => t.type === w.type);
        if (w.createdAt) list = list.filter((t) => matchesDate(t.createdAt, w.createdAt));
      }
      return list;
    },
    async create(args: any) {
      const d = args.data;
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
    async update(args: any) {
      const id = args.where.id;
      const t = mockStore.transactions.find((tx) => tx.id === id);
      if (!t) throw new Error("Transaction not found");
      const d = args.data;
      if (d.method !== undefined) t.method = d.method;
      if (d.reference !== undefined) t.reference = d.reference;
      return t;
    },
    async deleteMany() {
      mockStore.transactions = [];
      return { count: 0 };
    },
    async aggregate(args?: any) {
      let list = mockStore.transactions;
      if (args?.where) {
        const w = args.where;
        if (w.type) list = list.filter((t) => t.type === w.type);
        if (w.createdAt) list = list.filter((t) => matchesDate(t.createdAt, w.createdAt));
      }
      const sum = list.reduce((acc, t) => acc + t.amount, 0);
      return { _sum: { amount: sum } };
    },
    async groupBy(args: any) {
      let list = mockStore.transactions;
      if (args?.where) {
        const w = args.where;
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
    async findUnique(args: any) {
      const email = args?.where?.email;
      if (!email) return null;
      return mockStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    async deleteMany() {
      mockStore.users = [];
      return { count: 0 };
    },
  },

  async $transaction(fn: any) {
    if (typeof fn === "function") {
      return fn(mockPrisma);
    }
    return Promise.all(fn);
  },
};

export const prisma = mockPrisma;
