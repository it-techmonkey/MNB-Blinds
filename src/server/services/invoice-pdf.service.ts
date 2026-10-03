import PDFDocument from "pdfkit";
import type { Invoice, InvoiceItem, Client } from "@/generated/prisma/client";
import { formatDecimal, formatUnit } from "@/server/serialize";
import { COMPANY_LETTERHEAD } from "@/lib/site";
import { drawPdfLetterhead, drawPdfFooter, PDF_FOOTER_HEIGHT } from "@/server/services/pdf-layout";

export type InvoiceForPdf = Invoice & {
  items: InvoiceItem[];
  client: Pick<Client, "id" | "code" | "name"> | null;
};

const FOOTER_HEIGHT = PDF_FOOTER_HEIGHT;

function drawLetterhead(doc: PDFKit.PDFDocument): void {
  drawPdfLetterhead(doc, "Invoice");
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  drawPdfFooter(doc, [
    `Bank details: ${COMPANY_LETTERHEAD.bankDetails}`,
    "Payment: offline — reference this invoice number when paying.",
  ]);
}

export function buildInvoicePdf(invoice: InvoiceForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc);
      }
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    drawLetterhead(doc);
    doc.fontSize(10);
    doc.text(`Invoice number: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${invoice.createdAt.toISOString().slice(0, 10)}`);
    doc.text(`Client: ${invoice.clientNameSnapshot}${invoice.client ? ` (${invoice.client.code})` : ""}`);
    doc.text(`Payment status: ${invoice.paymentStatus}`);
    doc.moveDown();

    doc.fontSize(12).text("Line items", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9);

    let y = doc.y;
    const colCode = 50;
    const colDesc = 112;
    const colQty = 248;
    const colUnit = 282;
    const colPrice = 380;
    const colTotal = 465;

    doc.font("Helvetica-Bold");
    doc.text("Code", colCode, y);
    doc.text("Product", colDesc, y);
    doc.text("Qty", colQty, y);
    doc.text("Unit", colUnit, y);
    doc.text("Price/unit", colPrice, y);
    doc.text("Total", colTotal, y);
    y += 18;
    doc.font("Helvetica");

    const contentBottom = doc.page.height - FOOTER_HEIGHT - 30;

    for (const item of invoice.items) {
      if (y > contentBottom) {
        doc.addPage();
        drawLetterhead(doc);
        y = doc.y;
      }
      doc.text(item.productCodeSnapshot, colCode, y, { width: 65 });
      const unit = formatUnit(item.unitSnapshot, item.unitDetailSnapshot);
      doc.text(item.productNameSnapshot, colDesc, y, { width: 130 });
      doc.text(String(item.quantity), colQty, y, { width: 30 });
      doc.text(unit, colUnit, y, { width: 92 });
      doc.text(formatDecimal(item.price), colPrice, y);
      doc.text(formatDecimal(item.total), colTotal, y);
      y += Math.max(18, doc.heightOfString(item.productNameSnapshot, { width: 130 }) + 4, doc.heightOfString(unit, { width: 92 }) + 4);
    }

    if (y + 40 > contentBottom) {
      doc.addPage();
      drawLetterhead(doc);
      y = doc.y;
    }
    doc.y = y;
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(10).text(`Total amount: ${formatDecimal(invoice.totalAmount)}`, { align: "right" });

    doc.end();
  });
}
