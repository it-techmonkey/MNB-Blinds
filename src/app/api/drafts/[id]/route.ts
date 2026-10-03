import { NextRequest } from "next/server";
import { saveDraftSchema } from "@/server/validation/schemas";
import { deleteDraft, getDraft, updateDraft } from "@/server/services/draft.service";
import { serializeDraft } from "@/server/serialize";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

function handleError(e: unknown) {
  if (e instanceof ZodError) return jsonError("Validation failed", 400, e.flatten());
  if (e instanceof AppError) return jsonError(e.message, e.statusCode);
  console.error(e);
  return jsonError("Internal server error", 500);
}

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    return jsonOk({ draft: serializeDraft(await getDraft(id)) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const { clientId, items } = saveDraftSchema.parse(await request.json());
    return jsonOk({ draft: serializeDraft(await updateDraft(id, clientId, items)) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    await deleteDraft(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
