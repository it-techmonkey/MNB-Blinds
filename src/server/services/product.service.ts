import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/server/errors";
import { formatDecimal, formatUnit } from "@/server/serialize";

export function serializeProduct(p: {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  unitDetail: string | null;
  currentCost: Prisma.Decimal;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    unitDetail: p.unitDetail,
    currentCost: formatDecimal(p.currentCost),
    stock: p.stock,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeRestock(r: {
  id: string;
  quantity: number;
  costPerUnit: Prisma.Decimal;
  purchasedAt: Date;
  note: string | null;
}) {
  return {
    id: r.id,
    quantity: r.quantity,
    costPerUnit: formatDecimal(r.costPerUnit),
    purchasedAt: r.purchasedAt.toISOString(),
    note: r.note,
  };
}

export function serializeStockAdjustment(a: {
  id: string;
  type: "INCREASE" | "DECREASE";
  quantity: number;
  reason: "MISSING" | "FOUND" | "MISPLACED" | "COUNTING_ERROR" | "OTHER";
  note: string | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    type: a.type,
    quantity: a.quantity,
    reason: a.reason,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function listProductsAdmin(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.count(),
  ]);
  return {
    data: items.map(serializeProduct),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function listAllProductsAdmin(activeOnly = false) {
  const items = await prisma.product.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
  return items.map(serializeProduct);
}

export async function getProductById(id: string) {
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Product not found");
  return serializeProduct(p);
}

export async function getProductRestocks(productId: string) {
  const rows = await prisma.productRestock.findMany({
    where: { productId },
    orderBy: { purchasedAt: "desc" },
  });
  return rows.map(serializeRestock);
}

export async function getProductStockAdjustments(productId: string) {
  const rows = await prisma.productStockAdjustment.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeStockAdjustment);
}

export async function createProduct(input: {
  code: string;
  name: string;
  unit: string;
  unitDetail?: string;
  openingStock: number;
  openingCost: number;
  purchaseCostNote?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          code: input.code,
          name: input.name,
          unit: input.unit,
          unitDetail: input.unitDetail?.trim() || null,
          stock: input.openingStock,
          currentCost: new Prisma.Decimal(input.openingCost),
        },
      });
      if (input.openingStock > 0) {
        await tx.productRestock.create({
          data: {
            productId: product.id,
            quantity: input.openingStock,
            costPerUnit: new Prisma.Decimal(input.openingCost),
            note: input.purchaseCostNote?.trim() || "Opening stock",
          },
        });
      }
      return product;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("Product code already exists", 409, "CODE_TAKEN");
    }
    throw e;
  }
}

export async function updateProduct(
  id: string,
  patch: { code?: string; name?: string; unit?: string | null; unitDetail?: string | null; isActive?: boolean }
) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product not found");

  const data: Prisma.ProductUpdateInput = {};
  if (patch.code !== undefined) data.code = patch.code;
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.unit !== undefined) data.unit = patch.unit?.trim() || null;
  if (patch.unitDetail !== undefined) data.unitDetail = patch.unitDetail?.trim() || null;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  if (Object.keys(data).length === 0) {
    throw new AppError("No fields to update", 400);
  }

  try {
    return await prisma.product.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("Product code already exists", 409, "CODE_TAKEN");
    }
    throw e;
  }
}

export async function restockProduct(
  productId: string,
  input: { quantity: number; costPerUnit: number; note?: string }
) {
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) throw new NotFoundError("Product not found");

  return prisma.$transaction(async (tx) => {
    await tx.productRestock.create({
      data: {
        productId,
        quantity: input.quantity,
        costPerUnit: new Prisma.Decimal(input.costPerUnit),
        note: input.note?.trim() || null,
      },
    });
    return tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: input.quantity },
        currentCost: new Prisma.Decimal(input.costPerUnit),
      },
    });
  });
}

export async function adjustProductStock(
  productId: string,
  input: {
    type: "INCREASE" | "DECREASE";
    quantity: number;
    reason: "MISSING" | "FOUND" | "MISPLACED" | "COUNTING_ERROR" | "OTHER";
    note?: string;
  }
) {
  const existing = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!existing) throw new NotFoundError("Product not found");

  return prisma.$transaction(async (tx) => {
    const update = await tx.product.updateMany({
      where: input.type === "DECREASE" ? { id: productId, stock: { gte: input.quantity } } : { id: productId },
      data: input.type === "DECREASE" ? { stock: { decrement: input.quantity } } : { stock: { increment: input.quantity } },
    });
    if (update.count !== 1) {
      throw new AppError("This adjustment would take stock below zero", 409, "INSUFFICIENT_STOCK");
    }

    return tx.productStockAdjustment.create({
      data: {
        productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        note: input.note?.trim() || null,
      },
    });
  });
}

export async function updateProductRestock(
  productId: string,
  restockId: string,
  patch: { quantity?: number; costPerUnit?: number; note?: string | null; purchasedAt?: Date }
) {
  const [product, restock] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.productRestock.findUnique({ where: { id: restockId } }),
  ]);
  if (!product) throw new NotFoundError("Product not found");
  if (!restock || restock.productId !== productId) throw new NotFoundError("Restock not found");

  const newQuantity = patch.quantity ?? restock.quantity;
  const newCostPerUnit = patch.costPerUnit !== undefined ? new Prisma.Decimal(patch.costPerUnit) : restock.costPerUnit;
  const newNote = patch.note !== undefined ? patch.note?.trim() || null : restock.note;
  const newPurchasedAt = patch.purchasedAt ?? restock.purchasedAt;
  const quantityDelta = newQuantity - restock.quantity;

  if (product.stock + quantityDelta < 0) {
    throw new AppError(
      "Reducing this batch's quantity would take stock below zero — record a new restock first",
      409,
      "INSUFFICIENT_STOCK"
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.productRestock.update({
      where: { id: restockId },
      data: { quantity: newQuantity, costPerUnit: newCostPerUnit, note: newNote, purchasedAt: newPurchasedAt },
    });

    const latest = await tx.productRestock.findFirst({
      where: { productId },
      orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
    });

    return tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: quantityDelta },
        currentCost: latest?.costPerUnit ?? product.currentCost,
      },
    });
  });
}

export async function getDashboardStats() {
  const [totalProducts, stockAgg, unpaidAgg] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.invoice.aggregate({
      where: { paymentStatus: "UNPAID", creditNote: { is: null } },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAgg = await prisma.invoiceItem.aggregate({
    where: { invoice: { createdAt: { gte: monthStart }, creditNote: { is: null } } },
    _sum: { quantity: true, total: true },
  });

  return {
    totalProducts,
    totalStock: stockAgg._sum.stock ?? 0,
    unitsSoldThisMonth: monthAgg._sum.quantity ?? 0,
    revenueThisMonth: (monthAgg._sum.total ?? new Prisma.Decimal(0)).toFixed(2),
    unpaidInvoiceCount: unpaidAgg._count,
    unpaidInvoiceTotal: (unpaidAgg._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
  };
}

export type MonthlySalesRow = {
  month: string; // ISO date of the first of the month
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  unitsSold: number;
  revenue: string;
};

export async function getMonthlySales(): Promise<MonthlySalesRow[]> {
  const rows = await prisma.$queryRaw<
    { month: Date; productId: string; unitSnapshot: string | null; unitDetailSnapshot: string | null; unitsSold: bigint; revenue: Prisma.Decimal }[]
  >`
    SELECT
      DATE_TRUNC('month', i."created_at") AS month,
      ii."product_id" AS "productId",
      ii."unit_snapshot" AS "unitSnapshot",
      ii."unit_detail_snapshot" AS "unitDetailSnapshot",
      SUM(ii."quantity")::bigint AS "unitsSold",
      SUM(ii."total") AS revenue
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    WHERE NOT EXISTS (SELECT 1 FROM "credit_notes" cn WHERE cn."invoice_id" = i."id")
    GROUP BY DATE_TRUNC('month', i."created_at"), ii."product_id", ii."unit_snapshot", ii."unit_detail_snapshot"
    ORDER BY month DESC
  `;
  if (rows.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.productId))] } },
    select: { id: true, code: true, name: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  return rows.map((r) => {
    const product = productById.get(r.productId);
    return {
      month: r.month.toISOString(),
      productId: r.productId,
      productCode: product?.code ?? "—",
      productName: product?.name ?? "Deleted product",
      unit: formatUnit(r.unitSnapshot, r.unitDetailSnapshot),
      unitsSold: Number(r.unitsSold),
      revenue: r.revenue.toFixed(2),
    };
  });
}
