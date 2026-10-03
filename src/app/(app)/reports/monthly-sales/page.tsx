import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getMonthlySales } from "@/server/services/product.service";
import { redirect } from "next/navigation";

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

type SortField = "code" | "product" | "units" | "revenue";
type SortDirection = "asc" | "desc";
function isSortField(value: string | undefined): value is SortField { return value === "code" || value === "product" || value === "units" || value === "revenue"; }
function SortHeader({ field, label, activeField, direction }: { field: SortField; label: string; activeField: SortField; direction: SortDirection }) {
  const active = field === activeField;
  const next: SortDirection = active && direction === "asc" ? "desc" : "asc";
  return <Link href={`/reports/monthly-sales?sort=${field}&direction=${next}`} className="inline-flex items-center gap-1 font-medium hover:text-foreground">{label}<span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></Link>;
}

export default async function MonthlySalesReportPage({ searchParams }: { searchParams: Promise<{ sort?: string; direction?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const sort = isSortField(query.sort) ? query.sort : "units";
  const direction: SortDirection = query.direction === "asc" ? "asc" : "desc";
  const rows = (await getMonthlySales()).sort((a, b) => {
    const left = sort === "code" ? a.productCode : sort === "product" ? a.productName : sort === "units" ? a.unitsSold : Number(a.revenue);
    const right = sort === "code" ? b.productCode : sort === "product" ? b.productName : sort === "units" ? b.unitsSold : Number(b.revenue);
    const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
    return direction === "asc" ? comparison : -comparison;
  });
  const totalUnits = rows.reduce((sum, r) => sum + r.unitsSold, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);

  const groupsByLabel = new Map<string, typeof rows>();
  for (const r of rows) {
    const label = monthLabel(r.month);
    const group = groupsByLabel.get(label);
    if (group) group.push(r); else groupsByLabel.set(label, [r]);
  }
  const groups = Array.from(groupsByLabel, ([label, monthRows]) => ({ label, rows: monthRows }));

  return (
    <div className="content-stack">
      <PageHeader kicker="Reports" title="Monthly sales" subtitle="Units sold and revenue per product, broken down by month." />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Product-months with sales</p>
          <p className="stat-value">{rows.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total units sold</p>
          <p className="stat-value">{totalUnits}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total revenue</p>
          <p className="stat-value">${totalRevenue.toFixed(2)}</p>
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="card-dashboard px-6 py-14 text-center text-sm text-muted-foreground">No invoices yet.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label} className="card-dashboard overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                <span className="text-xs text-muted-foreground">Select a column to sort</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-4 py-3"><SortHeader field="code" label="Code" activeField={sort} direction={direction} /></th>
                      <th className="px-4 py-3"><SortHeader field="product" label="Product" activeField={sort} direction={direction} /></th>
                      <th className="px-4 py-3 text-right"><SortHeader field="units" label="Units sold" activeField={sort} direction={direction} /></th>
                      <th className="px-4 py-3 text-right"><SortHeader field="revenue" label="Revenue" activeField={sort} direction={direction} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r) => (
                      <tr key={`${group.label}-${r.productId}-${r.unit}`} className="table-row">
                        <td className="px-4 py-3 text-muted-foreground">{r.productCode}</td>
                        <td className="px-4 py-3 font-semibold">{r.productName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {r.unitsSold} <span className="text-xs text-muted-foreground">{r.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">${r.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
