import Link from "next/link";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { PaymentStatusSelect } from "@/components/PaymentStatusSelect";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listAllInvoices } from "@/server/services/invoice.service";
import { serializeInvoiceRow } from "@/server/serialize";
import { redirect } from "next/navigation";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const fmt = (dt: Date) => dt.toDateString();
  if (fmt(d) === fmt(today)) return "Today";
  if (fmt(d) === fmt(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { data, pagination } = await listAllInvoices(page, 20);
  const rows = data.map(serializeInvoiceRow);

  const totalValue = rows.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const unpaidCount = rows.filter((i) => i.paymentStatus === "UNPAID").length;

  const groups: { label: string; invoices: typeof rows }[] = [];
  for (const inv of rows) {
    const label = dateLabel(inv.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.invoices.push(inv);
    else groups.push({ label, invoices: [inv] });
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Sales"
        title="Invoices"
        subtitle="Every sale, in the order it happened."
        actions={
          <Link href="/invoices/new" className="btn-primary w-full lg:w-auto">
            New invoice
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Invoices on page</p>
          <p className="stat-value">{rows.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Unpaid</p>
          <p className="stat-value">{unpaidCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Page value</p>
          <p className="stat-value">${totalValue.toFixed(2)}</p>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="card-dashboard flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">No invoices yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Invoices you create will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</p>
              <div className="table-shell overflow-x-auto">
                <table className="w-full min-w-225 text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-3 py-3 font-medium">Client</th>
                      <th className="px-3 py-3 font-medium">Invoice #</th>
                      <th className="px-3 py-3 font-medium">Time</th>
                      <th className="px-3 py-3 text-right font-medium">Total</th>
                      <th className="px-3 py-3 font-medium">Payment</th>
                      <th className="px-3 py-3 text-right font-medium">View</th>
                      <th className="px-3 py-3 text-right font-medium">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.invoices.map((inv) => (
                      <tr key={inv.id} className="table-row">
                        <td className="px-3 py-3 font-semibold text-foreground">{inv.clientName}</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          <Link href={`/invoices/${inv.id}`} className="hover:text-foreground hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">${inv.totalAmount}</td>
                        <td className="px-3 py-3">
                          <PaymentStatusSelect invoiceId={inv.id} current={inv.paymentStatus} compact />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/invoices/${inv.id}`} className="text-xs font-semibold text-primary hover:underline">
                            View
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <InvoicePdfLink invoiceId={inv.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 ? (
            <Link href={`/invoices?page=${page - 1}`} className="btn-secondary h-9 px-3 text-xs">
              Previous
            </Link>
          ) : null}
          <span className="px-3 text-xs text-muted-foreground">
            {page} / {pagination.totalPages}
          </span>
          {page < pagination.totalPages ? (
            <Link href={`/invoices?page=${page + 1}`} className="btn-secondary h-9 px-3 text-xs">
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
