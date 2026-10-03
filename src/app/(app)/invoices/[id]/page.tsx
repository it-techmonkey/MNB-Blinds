import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { PaymentStatusSelect } from "@/components/PaymentStatusSelect";
import { IssueCreditNoteButton } from "@/components/IssueCreditNoteButton";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getInvoiceById } from "@/server/services/invoice.service";
import { serializeInvoice } from "@/server/serialize";
import { NotFoundError } from "@/server/errors";

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  let invoice;
  try {
    invoice = await getInvoiceById(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const s = serializeInvoice(invoice);

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Sales"
        title={`Invoice ${s.invoiceNumber}`}
        subtitle={`Created ${new Date(s.createdAt).toLocaleString()}`}
        actions={
          <Link href="/invoices" className="btn-secondary w-full lg:w-auto">
            Back to invoices
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Client</p>
          <p className="stat-value !text-xl">
            {s.client ? (
              <Link href={`/clients/${s.client.id}`} className="hover:underline">
                {s.clientName}
              </Link>
            ) : (
              s.clientName
            )}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Payment</p>
          <div className="mt-2">
            <PaymentStatusBadge status={s.isCredited ? "CREDITED" : s.paymentStatus} />
          </div>
          {s.isCredited ? (
            <div className="mt-3 text-xs text-muted-foreground">
              <p>Credit note {s.creditNote?.creditNoteNumber} · ${s.creditNote?.amount}</p>
              <p>Issued {s.creditNote ? new Date(s.creditNote.createdAt).toLocaleString() : ""}</p>
              {s.creditNote?.reason ? <p className="mt-1">Reason: {s.creditNote.reason}</p> : null}
            </div>
          ) : (
            <div className="mt-3">
              <PaymentStatusSelect invoiceId={s.id} current={s.paymentStatus} compact />
            </div>
          )}
        </div>
        <div className="stat-card">
          <p className="stat-label">Total</p>
          <p className="stat-value">${s.totalAmount}</p>
          <InvoicePdfLink invoiceId={s.id} variant="button" className="btn-ink mt-3 h-10 w-full">
            Invoice PDF
          </InvoicePdfLink>
          {!s.isCredited ? <div className="mt-3"><IssueCreditNoteButton invoiceId={s.id} /></div> : null}
        </div>
      </section>

      <section className="table-shell overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 text-right font-medium">Stock left</th>
              <th className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 text-right font-medium">Price per unit</th>
              <th className="px-4 py-2.5 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((i) => (
              <tr key={i.id} className="table-row">
                <td className="px-4 py-2.5 text-muted-foreground">{i.productCode}</td>
                <td className="px-4 py-2.5">{i.productName}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{i.stockOnHand ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{i.quantity}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{i.unit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">${i.price}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">${i.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
