import type { Invoice, InvoiceItem, Prisma } from "@prisma/client";

/** Stable string for Prisma.Decimal in UI and PDFs */
export function formatDecimal(d: Prisma.Decimal): string {
  return d.toFixed(2);
}

/** List row without line items (lighter DB payload). */
export function serializeInvoiceRow(inv: Invoice) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    clientName: inv.clientNameSnapshot,
    paymentStatus: inv.paymentStatus,
    totalAmount: formatDecimal(inv.totalAmount),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

type InvoiceWithRelations = Invoice & {
  items: (InvoiceItem & {
    product?: { id: string; stock: number } | null;
  })[];
  client?: { id: string; code: string; name: string } | null;
};

export function serializeInvoice(inv: InvoiceWithRelations) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    clientName: inv.clientNameSnapshot,
    client: inv.client ?? undefined,
    paymentStatus: inv.paymentStatus,
    totalAmount: formatDecimal(inv.totalAmount),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    items: inv.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productCode: i.productCodeSnapshot,
      productName: i.productNameSnapshot,
      price: formatDecimal(i.price),
      quantity: i.quantity,
      total: formatDecimal(i.total),
      stockOnHand: i.product?.stock ?? null,
    })),
  };
}
