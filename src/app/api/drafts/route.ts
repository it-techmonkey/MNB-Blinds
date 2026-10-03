import { NextRequest } from "next/server";
import { saveDraftSchema } from "@/server/validation/schemas";
import { createDraft, listDrafts } from "@/server/services/draft.service";
import { serializeDraft } from "@/server/serialize";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const drafts = await listDrafts();
    return jsonOk({ data: drafts.map(serializeDraft) });
  } catch (e) {
    if (e instanceof AppError) return jsonError(e.message, e.statusCode);
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const { clientId, items } = saveDraftSchema.parse(await request.json());
    const draft = await createDraft(clientId, items);
    return jsonOk({ draft: serializeDraft(draft) }, 201);
  } catch (e) {
    if (e instanceof ZodError) return jsonError("Validation failed", 400, e.flatten());
    if (e instanceof AppError) return jsonError(e.message, e.statusCode);
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
