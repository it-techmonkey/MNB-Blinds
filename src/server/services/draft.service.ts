import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/server/errors";
import type { InvoiceLineInput } from "@/server/services/invoice.service";

const draftInclude = {
  client: { select: { id: true, code: true, name: true } },
  items: { include: { product: { select: { id: true, code: true, name: true } } } },
} satisfies Prisma.InvoiceDraftInclude;

export async function createDraft(clientId: string, items: InvoiceLineInput[]) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new NotFoundError("Client not found");
  return prisma.invoiceDraft.create({
    data: { clientId, items: { create: items } },
    include: draftInclude,
  });
}

export async function updateDraft(id: string, clientId: string, items: InvoiceLineInput[]) {
  const existing = await prisma.invoiceDraft.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Draft not found");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new NotFoundError("Client not found");
  return prisma.invoiceDraft.update({
    where: { id },
    data: { clientId, items: { deleteMany: {}, create: items } },
    include: draftInclude,
  });
}

export async function getDraft(id: string) {
  const draft = await prisma.invoiceDraft.findUnique({ where: { id }, include: draftInclude });
  if (!draft) throw new NotFoundError("Draft not found");
  return draft;
}

export async function listDrafts() {
  return prisma.invoiceDraft.findMany({ orderBy: { updatedAt: "desc" }, include: draftInclude });
}

export async function countDrafts() {
  return prisma.invoiceDraft.count();
}

export async function deleteDraft(id: string) {
  const existing = await prisma.invoiceDraft.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Draft not found");
  await prisma.invoiceDraft.delete({ where: { id } });
}
