import { COMPANY_LETTERHEAD } from "@/lib/site";

/** Reserved space at the bottom of every page for drawPdfFooter. */
export const PDF_FOOTER_HEIGHT = 70;

export function drawPdfLetterhead(doc: PDFKit.PDFDocument, title: string): void {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;

  doc.font("Helvetica-Bold").fontSize(18).text(COMPANY_LETTERHEAD.name, left, top, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      [...COMPANY_LETTERHEAD.addressLines, COMPANY_LETTERHEAD.phone, COMPANY_LETTERHEAD.email].join("\n"),
      { align: "right", width: right - left }
    );

  const ruleY = doc.y + 6;
  doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(1).strokeColor("#999999").stroke();
  doc.strokeColor("black");
  doc.y = ruleY + 14;

  doc.font("Helvetica-Bold").fontSize(16).text(title, left, doc.y, { align: "center", width: right - left });
  doc.moveDown();
  doc.font("Helvetica").fontSize(10);
}

export function drawPdfFooter(doc: PDFKit.PDFDocument, extraLines: string[] = []): void {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - PDF_FOOTER_HEIGHT;

  doc.moveTo(left, y).lineTo(left + width, y).lineWidth(1).strokeColor("#999999").stroke();
  doc.strokeColor("black");

  doc
    .font("Helvetica")
    .fontSize(7)
    .text(
      `${COMPANY_LETTERHEAD.name} | Reg. No. ${COMPANY_LETTERHEAD.registrationNumber} | VAT No. ${COMPANY_LETTERHEAD.vatNumber}`,
      left,
      y + 8,
      { align: "center", width }
    );
  for (const line of extraLines) {
    doc.text(line, left, doc.y, { align: "center", width });
  }
}
