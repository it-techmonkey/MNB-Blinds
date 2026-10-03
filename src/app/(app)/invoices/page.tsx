import Link from "next/link";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";
import { PaymentStatusSelect } from "@/components/PaymentStatusSelect";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { countDrafts } from "@/server/services/draft.service";
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

type SortField = "client" | "number" | "time" | "total";
type SortDirection = "asc" | "desc";

function isSortField(value: string | undefined): value is SortField {
  return value === "client" || value === "number" || value === "time" || value === "total";
}

function SortHeader({ field, label, activeField, direction }: { field: SortField; label: string; activeField: SortField; direction: SortDirection }) {
  const active = field === activeField;
  const nextDirection: SortDirection = active && direction === "asc" ? "desc" : "asc";
  return <Link href={`/invoices?sort=${field}&direction=${nextDirection}`} className="inline-flex items-center gap-1 font-medium hover:text-foreground">{label}<span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></Link>;
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string; direction?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ data, pagination }, draftCount] = await Promise.all([listAllInvoices(page, 20), countDrafts()]);
  const sort = isSortField(sp.sort) ? sp.sort : "time";
  const direction: SortDirection = sp.direction === "asc" ? "asc" : "desc";
  const rows = data.map(serializeInvoiceRow).sort((a, b) => {
    const left = sort === "client" ? a.clientName : sort === "number" ? a.invoiceNumber : sort === "total" ? Number(a.totalAmount) : new Date(a.createdAt).getTime();
    const right = sort === "client" ? b.clientName : sort === "number" ? b.invoiceNumber : sort === "total" ? Number(b.totalAmount) : new Date(b.createdAt).getTime();
    const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
    return direction === "asc" ? comparison : -comparison;
  });

  const activeRows = rows.filter((i) => !i.isCredited);
  const totalValue = activeRows.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const unpaidCount = activeRows.filter((i) => i.paymentStatus === "UNPAID").length;

  const groupsByLabel = new Map<string, typeof rows>();
  for (const inv of rows) {
    const label = dateLabel(inv.createdAt);
    const group = groupsByLabel.get(label);
    if (group) group.push(inv);
    else groupsByLabel.set(label, [inv]);
  }
  const groups = Array.from(groupsByLabel, ([label, invoices]) => ({ label, invoices }));

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Sales"
        title="Invoices"
        subtitle="Every sale, in the order it happened."
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <Link href="/invoices/drafts" className="btn-secondary w-full lg:w-auto">
              Saved drafts{draftCount > 0 ? ` (${draftCount})` : ""}
            </Link>
            <Link href="/invoices/new" className="btn-primary w-full lg:w-auto">
              New invoice
            </Link>
          </div>
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
                      <th className="px-3 py-3"><SortHeader field="client" label="Client" activeField={sort} direction={direction} /></th>
                      <th className="px-3 py-3"><SortHeader field="number" label="Invoice #" activeField={sort} direction={direction} /></th>
                      <th className="px-3 py-3"><SortHeader field="time" label="Time" activeField={sort} direction={direction} /></th>
                      <th className="px-3 py-3 text-right"><SortHeader field="total" label="Total" activeField={sort} direction={direction} /></th>
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
                          {inv.isCredited ? <PaymentStatusBadge status="CREDITED" /> : <PaymentStatusSelect invoiceId={inv.id} current={inv.paymentStatus} compact />}
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
