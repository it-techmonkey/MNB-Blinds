import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById } from "@/server/services/invoice.service";
import { buildInvoicePdf } from "@/server/services/invoice-pdf.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError } from "@/lib/http";
import { AppError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const invoice = await getInvoiceById(id);

    const buffer = await buildInvoicePdf(invoice);
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error("[invoice-pdf]", e);
    return jsonError("Internal server error", 500);
  }
}
