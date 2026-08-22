import { NextRequest } from "next/server";
import { clientUpdateSchema } from "@/server/validation/schemas";
import { getClientById, updateClient, getClientInvoiceHistory, serializeClient } from "@/server/services/client.service";
import { serializeInvoice } from "@/server/serialize";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const [client, invoices] = await Promise.all([getClientById(id), getClientInvoiceHistory(id)]);
    return jsonOk({ client, invoices: invoices.map((i) => serializeInvoice({ ...i, client: null })) });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const data = clientUpdateSchema.parse(body);
    const client = await updateClient(id, data);
    return jsonOk({ client: serializeClient(client) });
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
