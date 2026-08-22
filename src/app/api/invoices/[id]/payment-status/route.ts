import { NextRequest } from "next/server";
import { invoicePaymentStatusSchema } from "@/server/validation/schemas";
import { updateInvoicePaymentStatus } from "@/server/services/invoice.service";
import { serializeInvoice } from "@/server/serialize";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const { paymentStatus } = invoicePaymentStatusSchema.parse(body);
    const invoice = await updateInvoicePaymentStatus(id, paymentStatus);
    return jsonOk({ invoice: serializeInvoice(invoice) });
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
