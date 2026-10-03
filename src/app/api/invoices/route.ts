import { NextRequest } from "next/server";
import { paginationSchema, createInvoiceSchema } from "@/server/validation/schemas";
import { createInvoice, listAllInvoices } from "@/server/services/invoice.service";
import { serializeInvoice, serializeInvoiceRow } from "@/server/serialize";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const { page, limit } = paginationSchema.parse(Object.fromEntries(searchParams.entries()));
    const result = await listAllInvoices(page, limit);
    return jsonOk({ data: result.data.map(serializeInvoiceRow), pagination: result.pagination });
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    const conn = connectionErrorResponse(e);
    if (conn) {
      console.error(e);
      return jsonError(conn.message, conn.status);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { clientId, items, draftId } = createInvoiceSchema.parse(body);
    const invoice = await createInvoice(clientId, items, draftId);
    return jsonOk({ invoice: serializeInvoice(invoice) }, 201);
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
