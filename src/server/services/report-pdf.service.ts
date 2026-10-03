import PDFDocument from "pdfkit";
import { drawPdfLetterhead, drawPdfFooter, PDF_FOOTER_HEIGHT } from "@/server/services/pdf-layout";
import type { ReportSummary, ProductBreakdownRow, ClientBreakdownRow, PaymentBreakdownRow } from "@/server/services/report.service";

const TITLE = "Sales report";

type Column = { label: string; x: number; width: number; align?: "left" | "right" };

function drawTableSection(
  doc: PDFKit.PDFDocument,
  opts: { title: string; columns: Column[]; rows: string[][]; contentBottom: number }
): void {
  doc.moveDown(1.2);
  if (doc.y + 50 > opts.contentBottom) {
    doc.addPage();
    drawPdfLetterhead(doc, TITLE);
  }
  doc.font("Helvetica-Bold").fontSize(12).text(opts.title, { underline: true });
  doc.moveDown(0.4);

  let y = doc.y;
  doc.fontSize(9).font("Helvetica-Bold");
  for (const col of opts.columns) {
    doc.text(col.label, col.x, y, { width: col.width, align: col.align ?? "left" });
  }
  y += 16;
  doc.font("Helvetica");

  if (opts.rows.length === 0) {
    doc.text("No data for this period.", opts.columns[0].x, y);
    y += 16;
  }

  for (const row of opts.rows) {
    if (y > opts.contentBottom) {
      doc.addPage();
      drawPdfLetterhead(doc, TITLE);
      y = doc.y;
    }
    opts.columns.forEach((col, i) => {
      doc.text(row[i] ?? "", col.x, y, { width: col.width, align: col.align ?? "left" });
    });
    y += 16;
  }
  doc.y = y;
}

export type SalesReportPdfInput = {
  summary: ReportSummary;
  byProduct: ProductBreakdownRow[];
  byClient: ClientBreakdownRow[];
  byPaymentStatus: PaymentBreakdownRow[];
  periodLabel: string;
  filterSummary: string;
};

export function buildSalesReportPdf(input: SalesReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawPdfFooter(doc);
      }
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    drawPdfLetterhead(doc, TITLE);
    doc.fontSize(10);
    doc.text(`Period: ${input.periodLabel}`);
    doc.text(`Filters: ${input.filterSummary}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(12).text("Summary", { underline: true });
    doc.font("Helvetica").fontSize(10).moveDown(0.4);
    doc.text(`Revenue: $${input.summary.revenue}`);
    doc.text(`Estimated cost: $${input.summary.cost}`);
    doc.text(`Estimated profit: $${input.summary.profit} (${input.summary.profitMargin}% margin)`);
    doc.text(`Units sold: ${input.summary.units}`);
    doc.text(`Invoices: ${input.summary.invoiceCount}`);
    doc.text(`Average order value: $${input.summary.avgOrderValue}`);
    doc.fontSize(8).fillColor("#666666").text("Profit is estimated using each product's current purchasing cost, not necessarily the cost at the time of sale.");
    doc.fillColor("black").fontSize(10);

    const contentBottom = doc.page.height - PDF_FOOTER_HEIGHT - 30;

    drawTableSection(doc, {
      title: "Payment status",
      contentBottom,
      columns: [
        { label: "Status", x: 50, width: 150 },
        { label: "Invoices", x: 220, width: 100, align: "right" },
        { label: "Revenue", x: 340, width: 150, align: "right" },
      ],
      rows: input.byPaymentStatus.map((r) => [r.status === "PAID" ? "Paid" : "Unpaid", String(r.invoiceCount), `$${r.revenue}`]),
    });

    drawTableSection(doc, {
      title: "Top products",
      contentBottom,
      columns: [
        { label: "Code", x: 50, width: 55 },
        { label: "Product", x: 105, width: 110 },
        { label: "Unit", x: 220, width: 45 },
        { label: "Qty", x: 268, width: 35, align: "right" },
        { label: "Revenue", x: 310, width: 80, align: "right" },
        { label: "Profit", x: 395, width: 80, align: "right" },
        { label: "Margin", x: 480, width: 50, align: "right" },
      ],
      rows: input.byProduct.map((r) => [
        r.productCode,
        r.productName,
        r.unit,
        String(r.unitsSold),
        `$${r.revenue}`,
        `$${r.profit}`,
        `${r.profitMargin}%`,
      ]),
    });

    drawTableSection(doc, {
      title: "Top clients",
      contentBottom,
      columns: [
        { label: "Client", x: 50, width: 180 },
        { label: "Invoices", x: 240, width: 70, align: "right" },
        { label: "Revenue", x: 320, width: 90, align: "right" },
        { label: "Profit", x: 420, width: 90, align: "right" },
      ],
      rows: input.byClient.map((r) => [r.clientName, String(r.invoiceCount), `$${r.revenue}`, `$${r.profit}`]),
    });

    doc.end();
  });
}
