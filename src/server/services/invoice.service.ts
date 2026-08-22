import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/server/errors";

function invoiceNumberPrefix(): string {
  const now = new Date();
  const datePart =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  return `INV-${datePart}-`;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient, prefix: string): Promise<string> {
  const count = await tx.invoice.count({ where: { invoiceNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export type InvoiceLineInput = { productId: string; quantity: number; price: number };

export async function createInvoice(clientId: string, items: InvoiceLineInput[]) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new NotFoundError("Client not found");

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  let totalAmount = new Prisma.Decimal(0);
  const lineCreates: {
    productId: string;
    productCodeSnapshot: string;
    productNameSnapshot: string;
    price: Prisma.Decimal;
    quantity: number;
    total: Prisma.Decimal;
  }[] = [];
  const stockDecrements: { productId: string; quantity: number; label: string }[] = [];

  for (const line of items) {
    const product = productById.get(line.productId);
    if (!product) throw new NotFoundError(`Product not found: ${line.productId}`);
    if (product.stock < line.quantity) {
      throw new AppError(`Insufficient stock for "${product.name}"`, 409, "INSUFFICIENT_STOCK");
    }
    const price = new Prisma.Decimal(line.price);
    const lineTotal = price.mul(line.quantity);
    totalAmount = totalAmount.add(lineTotal);
    lineCreates.push({
      productId: product.id,
      productCodeSnapshot: product.code,
      productNameSnapshot: product.name,
      price,
      quantity: line.quantity,
      total: lineTotal,
    });
    stockDecrements.push({ productId: product.id, quantity: line.quantity, label: product.name });
  }

  const prefix = invoiceNumberPrefix();
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          for (const d of stockDecrements) {
            const updated = await tx.product.updateMany({
              where: { id: d.productId, stock: { gte: d.quantity } },
              data: { stock: { decrement: d.quantity } },
            });
            if (updated.count !== 1) {
              throw new AppError(`Insufficient stock for "${d.label}"`, 409, "INSUFFICIENT_STOCK");
            }
          }

          for (const line of lineCreates) {
            await tx.clientProductPrice.upsert({
              where: { clientId_productId: { clientId, productId: line.productId } },
              update: { price: line.price },
              create: { clientId, productId: line.productId, price: line.price },
            });
          }

          const invoiceNumber = await nextInvoiceNumber(tx, prefix);

          return tx.invoice.create({
            data: {
              invoiceNumber,
              clientId,
              clientNameSnapshot: client.name,
              totalAmount,
              items: { create: lineCreates },
            },
            include: { items: true, client: { select: { id: true, code: true, name: true } } },
          });
        },
        { maxWait: 10_000, timeout: 15_000 }
      );
    } catch (e) {
      const isCollision =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        (e.meta?.target as string[] | undefined)?.includes("invoice_number");
      if (isCollision && attempt < MAX_ATTEMPTS) continue;
      throw e;
    }
  }
  throw new AppError("Could not generate a unique invoice number, please try again", 409, "INVOICE_NUMBER_CONFLICT");
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, stock: true } } } },
      client: { select: { id: true, code: true, name: true } },
    },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");
  return invoice;
}

export async function listAllInvoices(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count(),
  ]);
  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateInvoicePaymentStatus(id: string, paymentStatus: "UNPAID" | "PAID") {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Invoice not found");
  return prisma.invoice.update({
    where: { id },
    data: { paymentStatus },
    include: { items: true, client: { select: { id: true, code: true, name: true } } },
  });
}
