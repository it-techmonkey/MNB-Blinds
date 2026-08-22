import { NextRequest } from "next/server";
import { paginationSchema, productCreateSchema } from "@/server/validation/schemas";
import { listProductsAdmin, listAllProductsAdmin, createProduct, serializeProduct } from "@/server/services/product.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const q = Object.fromEntries(searchParams.entries());

    if (q.all === "true") {
      const activeOnly = q.activeOnly === "true";
      const data = await listAllProductsAdmin(activeOnly);
      return jsonOk({ data });
    }

    const { page, limit } = paginationSchema.parse(q);
    const result = await listProductsAdmin(page, limit);
    return jsonOk(result);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
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
    const data = productCreateSchema.parse(body);
    const product = await createProduct(data);
    return jsonOk({ product: serializeProduct(product) }, 201);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
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
