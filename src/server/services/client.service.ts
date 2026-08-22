import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/server/errors";

export function serializeClient(c: {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function listClientsAdmin() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  const agg = await prisma.invoice.groupBy({
    by: ["clientId"],
    _count: true,
    _sum: { totalAmount: true },
  });
  const aggByClient = new Map(agg.map((a) => [a.clientId, a]));

  return clients.map((c) => {
    const a = aggByClient.get(c.id);
    return {
      ...serializeClient(c),
      invoiceCount: a?._count ?? 0,
      totalSpent: (a?._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
    };
  });
}

export async function listAllClients(activeOnly = false) {
  const items = await prisma.client.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
  return items.map(serializeClient);
}

export async function getClientById(id: string) {
  const c = await prisma.client.findUnique({ where: { id } });
  if (!c) throw new NotFoundError("Client not found");
  return serializeClient(c);
}

export async function createClient(input: {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  try {
    return await prisma.client.create({
      data: {
        code: input.code,
        name: input.name,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("Client code already exists", 409, "CODE_TAKEN");
    }
    throw e;
  }
}

export async function updateClient(
  id: string,
  patch: Partial<{ name: string; phone: string | null; email: string | null; address: string | null; isActive: boolean }>
) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Client not found");

  const data: Prisma.ClientUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.phone !== undefined) data.phone = patch.phone?.trim() || null;
  if (patch.email !== undefined) data.email = patch.email?.trim() || null;
  if (patch.address !== undefined) data.address = patch.address?.trim() || null;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  if (Object.keys(data).length === 0) {
    throw new AppError("No fields to update", 400);
  }

  return prisma.client.update({ where: { id }, data });
}

export async function getClientProductPrices(clientId: string) {
  const rows = await prisma.clientProductPrice.findMany({
    where: { clientId },
    select: { productId: true, price: true },
  });
  return rows.map((r) => ({ productId: r.productId, price: r.price.toFixed(2) }));
}

export async function setClientProductPrices(
  clientId: string,
  prices: { productId: string; price: number }[]
) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new NotFoundError("Client not found");

  await prisma.$transaction(
    prices.map((p) =>
      prisma.clientProductPrice.upsert({
        where: { clientId_productId: { clientId, productId: p.productId } },
        update: { price: new Prisma.Decimal(p.price) },
        create: { clientId, productId: p.productId, price: new Prisma.Decimal(p.price) },
      })
    )
  );
}

export async function getClientInvoiceHistory(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new NotFoundError("Client not found");

  return prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}
