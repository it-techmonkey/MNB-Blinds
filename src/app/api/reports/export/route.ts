import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api";
import { jsonError } from "@/lib/http";
import { AppError } from "@/server/errors";
import { toCsv } from "@/lib/csv";
import {
  parseReportFilters,
  describeReportFilters,
  getReportDetailRows,
  getReportSummary,
  getProductBreakdown,
  getClientBreakdown,
  getPaymentBreakdown,
} from "@/server/services/report.service";
import { buildSalesReportPdf } from "@/server/services/report-pdf.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const q = Object.fromEntries(searchParams.entries());
    const format = (q.format ?? "").toLowerCase();
    if (format !== "csv" && format !== "pdf") {
      return jsonError("Invalid export format, expected csv or pdf", 400);
    }

    const parsed = parseReportFilters(q);
    const today = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const rows = await getReportDetailRows(parsed.filters);
      const csv = toCsv(
        [
          "Date",
          "Invoice #",
          "Client",
          "Payment status",
          "Product code",
          "Product name",
          "Quantity",
          "Unit price",
          "Line total",
          "Est. cost",
          "Est. profit",
        ],
        rows.map((r) => [
          r.createdAt.slice(0, 10),
          r.invoiceNumber,
          r.clientName,
          r.paymentStatus,
          r.productCode,
          r.productName,
          r.quantity,
          r.price,
          r.total,
          r.cost,
          r.profit,
        ])
      );
      const body = new TextEncoder().encode(csv);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sales-report-${today}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const [summary, byProduct, byClient, byPaymentStatus, description] = await Promise.all([
      getReportSummary(parsed.filters),
      getProductBreakdown(parsed.filters, 25),
      getClientBreakdown(parsed.filters, 25),
      getPaymentBreakdown(parsed.filters),
      describeReportFilters(parsed),
    ]);

    const buffer = await buildSalesReportPdf({
      summary,
      byProduct,
      byClient,
      byPaymentStatus,
      periodLabel: description.period,
      filterSummary: description.summary,
    });
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sales-report-${today}.pdf"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error("[reports-export]", e);
    return jsonError("Internal server error", 500);
  }
}
