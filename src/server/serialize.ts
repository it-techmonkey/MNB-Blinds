import type { CreditNote, Invoice, InvoiceItem, Prisma } from "@/generated/prisma/client";

/** Stable string for Prisma.Decimal in UI and PDFs */
export function formatDecimal(d: Prisma.Decimal): string {
  return d.toFixed(2);
}

/** List row without line items (lighter DB payload). */
function serializeCreditNote(creditNote: CreditNote) {
  return {
    id: creditNote.id,
    creditNoteNumber: creditNote.creditNoteNumber,
    amount: formatDecimal(creditNote.amount),
    reason: creditNote.reason,
    createdAt: creditNote.createdAt.toISOString(),
  };
}

export function serializeInvoiceRow(inv: Invoice & { creditNote?: CreditNote | null }) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    clientName: inv.clientNameSnapshot,
    paymentStatus: inv.paymentStatus,
    isCredited: Boolean(inv.creditNote),
    creditNote: inv.creditNote ? serializeCreditNote(inv.creditNote) : null,
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
  creditNote?: CreditNote | null;
};

export function serializeInvoice(inv: InvoiceWithRelations) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    clientName: inv.clientNameSnapshot,
    client: inv.client ?? undefined,
    paymentStatus: inv.paymentStatus,
    isCredited: Boolean(inv.creditNote),
    creditNote: inv.creditNote ? serializeCreditNote(inv.creditNote) : null,
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
