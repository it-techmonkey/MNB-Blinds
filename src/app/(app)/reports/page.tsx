import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { ReportTrendChart } from "@/components/ReportTrendChart";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import {
  parseReportFilters,
  buildReportQueryString,
  describeReportFilters,
  getSalesReport,
  type ParsedReportFilters,
} from "@/server/services/report.service";
import { listAllClients } from "@/server/services/client.service";
import { listAllProductsAdmin } from "@/server/services/product.service";

type SP = Record<string, string | undefined>;

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DateRange = { from: string; to: string };

function presetRange(kind: number | "month" | "year" | "all"): DateRange {
  const today = new Date();
  const to = toDateInput(today);
  if (kind === "all") return { from: "", to: "" };
  if (kind === "month") return { from: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  if (kind === "year") return { from: toDateInput(new Date(today.getFullYear(), 0, 1)), to };
  const start = new Date(today);
  start.setDate(start.getDate() - kind + 1);
  return { from: toDateInput(start), to };
}

function presetHref(range: DateRange, parsed: ParsedReportFilters): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  if (parsed.clientId) params.set("clientId", parsed.clientId);
  if (parsed.productId) params.set("productId", parsed.productId);
  if (parsed.paymentStatus) params.set("status", parsed.paymentStatus);
  return `/reports?${params.toString()}`;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const parsed = parseReportFilters(sp);

  const [report, clients, products, description] = await Promise.all([
    getSalesReport(parsed.filters),
    listAllClients(),
    listAllProductsAdmin(),
    describeReportFilters(parsed),
  ]);

  const exportQuery = buildReportQueryString(parsed);
  const paid = report.byPaymentStatus.find((r) => r.status === "PAID");
  const unpaid = report.byPaymentStatus.find((r) => r.status === "UNPAID");

  const presets: { label: string; range: DateRange }[] = [
    { label: "Last 7 days", range: presetRange(7) },
    { label: "Last 30 days", range: presetRange(30) },
    { label: "Last 90 days", range: presetRange(90) },
    { label: "This month", range: presetRange("month") },
    { label: "This year", range: presetRange("year") },
    { label: "All time", range: presetRange("all") },
  ];

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Reports"
        title="Analytics"
        subtitle="Revenue, units, and payment performance across every sale — filter, drill in, and export."
        actions={
          <div className="flex w-full gap-2 lg:w-auto">
            <a href={`/api/reports/export?${exportQuery}&format=csv`} className="btn-secondary flex-1 lg:flex-none">
              Export CSV
            </a>
            <a href={`/api/reports/export?${exportQuery}&format=pdf`} className="btn-primary flex-1 lg:flex-none">
              Export PDF
            </a>
          </div>
        }
      />

      <section className="card-dashboard space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = parsed.fromInput === p.range.from && parsed.toInput === p.range.to;
            return (
              <Link
                key={p.label}
                href={presetHref(p.range, parsed)}
                className={active ? "btn-primary h-9 px-3 text-xs" : "btn-secondary h-9 px-3 text-xs"}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        <form method="get" action="/reports" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="field-label" htmlFor="from">
              From
            </label>
            <input type="date" id="from" name="from" defaultValue={parsed.fromInput} className="input-field-sm mt-1.5" />
          </div>
          <div>
            <label className="field-label" htmlFor="to">
              To
            </label>
            <input type="date" id="to" name="to" defaultValue={parsed.toInput} className="input-field-sm mt-1.5" />
          </div>
          <div>
            <label className="field-label" htmlFor="clientId">
              Client
            </label>
            <select id="clientId" name="clientId" defaultValue={parsed.clientId} className="select-field mt-1.5 w-full">
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="productId">
              Product
            </label>
            <select id="productId" name="productId" defaultValue={parsed.productId} className="select-field mt-1.5 w-full">
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="status">
              Payment status
            </label>
            <select id="status" name="status" defaultValue={parsed.paymentStatus} className="select-field mt-1.5 w-full">
              <option value="">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <div className="flex items-end gap-2 lg:col-span-5">
            <button type="submit" className="btn-primary h-10 px-4 text-sm">
              Apply filters
            </button>
            <Link href="/reports" className="btn-secondary h-10 px-4 text-sm">
              Reset
            </Link>
            <p className="helper-text ml-auto self-center">
              Showing {description.period} · {description.client} · {description.product} · {description.status}
            </p>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <p className="stat-label">Revenue</p>
          <p className="stat-value">${report.summary.revenue}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Units sold</p>
          <p className="stat-value">{report.summary.units}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Invoices</p>
          <p className="stat-value">{report.summary.invoiceCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg. order value</p>
          <p className="stat-value">${report.summary.avgOrderValue}</p>
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="stat-card">
            <p className="stat-label">Estimated cost</p>
            <p className="stat-value">${report.summary.cost}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Estimated profit</p>
            <p className="stat-value">${report.summary.profit}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Profit margin</p>
            <p className="stat-value">{report.summary.profitMargin}%</p>
          </div>
        </div>
        <p className="helper-text px-1">
          Profit is estimated using each product&apos;s current purchasing cost, not necessarily the cost at the time of sale.
        </p>
      </section>

      <section className="card-dashboard p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Revenue trend</h2>
          <span className="text-xs text-muted-foreground capitalize">by {report.granularity}</span>
        </div>
        <div className="mt-4">
          <ReportTrendChart points={report.trend} granularity={report.granularity} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card-dashboard flex items-center justify-between p-5">
          <div>
            <PaymentStatusBadge status="PAID" />
            <p className="mt-2 text-sm text-muted-foreground">{paid?.invoiceCount ?? 0} invoices</p>
          </div>
          <p className="text-xl font-semibold tracking-[-0.03em] text-foreground tabular-nums">${paid?.revenue ?? "0.00"}</p>
        </div>
        <div className="card-dashboard flex items-center justify-between p-5">
          <div>
            <PaymentStatusBadge status="UNPAID" />
            <p className="mt-2 text-sm text-muted-foreground">{unpaid?.invoiceCount ?? 0} invoices</p>
          </div>
          <p className="text-xl font-semibold tracking-[-0.03em] text-foreground tabular-nums">${unpaid?.revenue ?? "0.00"}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-dashboard overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Top products</h2>
          </div>
          {report.byProduct.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No product sales in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 text-right font-medium">Units</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byProduct.map((r) => (
                    <tr key={`${r.productId}-${r.unit}`} className="table-row">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.productName}</p>
                        <p className="text-xs text-muted-foreground">{r.productCode}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.unitsSold}
                        <p className="text-xs text-muted-foreground">{r.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">${r.revenue}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <p className="font-medium text-foreground">${r.profit}</p>
                        <p className="text-xs text-muted-foreground">{r.profitMargin}%</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-dashboard overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Top clients</h2>
          </div>
          {report.byClient.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No client sales in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 text-right font-medium">Invoices</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byClient.map((r) => (
                    <tr key={r.clientId} className="table-row">
                      <td className="px-4 py-3 font-semibold text-foreground">{r.clientName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.invoiceCount}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">${r.revenue}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <p className="font-medium text-foreground">${r.profit}</p>
                        <p className="text-xs text-muted-foreground">{r.profitMargin}%</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="card-dashboard overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Transactions</h2>
          {report.detailRowsTruncated ? (
            <span className="text-xs text-muted-foreground">Showing latest {report.detailRows.length} · export CSV for full data</span>
          ) : (
            <span className="text-xs text-muted-foreground">{report.detailRows.length} line items</span>
          )}
        </div>
        {report.detailRows.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-muted-foreground">No transactions match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-250 text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Invoice #</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 text-right font-medium">Qty</th>
                  <th className="px-3 py-3 font-medium">Unit</th>
                  <th className="px-3 py-3 text-right font-medium">Price per unit</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-right font-medium">Profit</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.detailRows.map((r, i) => (
                  <tr key={`${r.invoiceId}-${i}`} className="table-row">
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      <Link href={`/invoices/${r.invoiceId}`} className="hover:text-foreground hover:underline">
                        {r.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-semibold text-foreground">{r.clientName}</td>
                    <td className="px-3 py-3">
                      <p className="text-foreground">{r.productName}</p>
                      <p className="text-xs text-muted-foreground">{r.productCode}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.unit}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${r.price}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">${r.total}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">${r.profit}</td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={r.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Looking for the old view? <Link href="/reports/monthly-sales" className="link-muted">Classic monthly breakdown →</Link>
      </p>
    </div>
  );
}
