import { NextRequest } from "next/server";
import { clientCreateSchema } from "@/server/validation/schemas";
import { listClientsAdmin, listAllClients, createClient, serializeClient } from "@/server/services/client.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    if (searchParams.get("all") === "true") {
      const activeOnly = searchParams.get("activeOnly") === "true";
      const data = await listAllClients(activeOnly);
      return jsonOk({ data });
    }
    const data = await listClientsAdmin();
    return jsonOk({ data });
  } catch (e) {
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
    const data = clientCreateSchema.parse(body);
    const client = await createClient(data);
    return jsonOk({ client: serializeClient(client) }, 201);
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
