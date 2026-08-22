import { NextRequest } from "next/server";
import { clientProductPricesSchema } from "@/server/validation/schemas";
import { getClientProductPrices, setClientProductPrices } from "@/server/services/client.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const prices = await getClientProductPrices(id);
    return jsonOk({ prices });
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
    const { prices } = clientProductPricesSchema.parse(body);
    await setClientProductPrices(id, prices);
    return jsonOk({ ok: true });
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
