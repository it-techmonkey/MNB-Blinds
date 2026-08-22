import { NextRequest } from "next/server";
import { getInvoiceById } from "@/server/services/invoice.service";
import { serializeInvoice } from "@/server/serialize";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const invoice = await getInvoiceById(id);
    return jsonOk({ invoice: serializeInvoice(invoice) });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
