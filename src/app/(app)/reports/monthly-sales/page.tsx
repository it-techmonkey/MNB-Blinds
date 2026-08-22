import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getMonthlySales } from "@/server/services/product.service";
import { redirect } from "next/navigation";

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default async function MonthlySalesReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await getMonthlySales();
  const totalUnits = rows.reduce((sum, r) => sum + r.unitsSold, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);

  const groups: { label: string; rows: typeof rows }[] = [];
  for (const r of rows) {
    const label = monthLabel(r.month);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }
  for (const g of groups) {
    g.rows.sort((a, b) => b.unitsSold - a.unitsSold);
  }

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
                <span className="text-xs text-muted-foreground">Sorted by units sold</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 text-right font-medium">Units sold</th>
                      <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r) => (
                      <tr key={`${group.label}-${r.productId}`} className="table-row">
                        <td className="px-4 py-3 text-muted-foreground">{r.productCode}</td>
                        <td className="px-4 py-3 font-semibold">{r.productName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.unitsSold}</td>
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
