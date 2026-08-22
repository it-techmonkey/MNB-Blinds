import { NextRequest } from "next/server";
import { productUpdateSchema } from "@/server/validation/schemas";
import { updateProduct, getProductById, getProductRestocks, serializeProduct } from "@/server/services/product.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const [product, restocks] = await Promise.all([getProductById(id), getProductRestocks(id)]);
    return jsonOk({ product, restocks });
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
    const data = productUpdateSchema.parse(body);
    const product = await updateProduct(id, data);
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
