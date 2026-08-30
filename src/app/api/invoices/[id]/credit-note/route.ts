import { NextRequest } from "next/server";
import { creditNoteCreateSchema } from "@/server/validation/schemas";
import { issueCreditNote } from "@/server/services/invoice.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const data = creditNoteCreateSchema.parse(await request.json());
    const creditNote = await issueCreditNote(id, data);
    return jsonOk({ creditNote }, 201);
  } catch (e) {
    if (e instanceof ZodError) return jsonError("Validation failed", 400, e.flatten());
    if (e instanceof AppError) return jsonError(e.message, e.statusCode);
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
