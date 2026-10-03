import type { CreditNote, Invoice, InvoiceItem, Prisma } from "@/generated/prisma/client";

/** Stable string for Prisma.Decimal in UI and PDFs */
export function formatDecimal(d: Prisma.Decimal): string {
  return d.toFixed(2);
}

/** "box · box of 100", just "box", or "—" when the product has no unit. */
export function formatUnit(unit: string | null | undefined, unitDetail: string | null | undefined): string {
  return [unit, unitDetail].filter(Boolean).join(" · ") || "—";
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
      unit: formatUnit(i.unitSnapshot, i.unitDetailSnapshot),
      price: formatDecimal(i.price),
      quantity: i.quantity,
      total: formatDecimal(i.total),
      stockOnHand: i.product?.stock ?? null,
    })),
  };
}

type DraftWithRelations = {
  id: string;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; code: string; name: string };
  items: { productId: string; quantity: number; price: Prisma.Decimal; product: { code: string; name: string } }[];
};

export function serializeDraft(draft: DraftWithRelations) {
  return {
    id: draft.id,
    clientId: draft.clientId,
    clientName: draft.client.name,
    clientCode: draft.client.code,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    totalAmount: draft.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0).toFixed(2),
    items: draft.items.map((i) => ({
      productId: i.productId,
      productCode: i.product.code,
      productName: i.product.name,
      quantity: i.quantity,
      price: formatDecimal(i.price),
    })),
  };
}
