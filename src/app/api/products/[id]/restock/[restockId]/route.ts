import { NextRequest } from "next/server";
import { restockUpdateSchema } from "@/server/validation/schemas";
import { updateProductRestock, serializeProduct } from "@/server/services/product.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string; restockId: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id, restockId } = await context.params;
    const body = await request.json();
    const data = restockUpdateSchema.parse(body);
    const product = await updateProductRestock(id, restockId, data);
    return jsonOk({ product: serializeProduct(product) });
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
