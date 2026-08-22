import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { getDashboardStats } from "@/server/services/product.service";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stats = await getDashboardStats();

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Overview"
        title="Dashboard"
        subtitle="How much sold this month, and what's left in the warehouse."
        actions={
          <Link href="/invoices/new" className="btn-primary w-full lg:w-auto">
            New invoice
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Active products</p>
          <p className="stat-value">{stats.totalProducts}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total stock units</p>
          <p className="stat-value">{stats.totalStock}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Units sold this month</p>
          <p className="stat-value">{stats.unitsSoldThisMonth}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Revenue this month</p>
          <p className="stat-value">${stats.revenueThisMonth}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Unpaid invoices</p>
          <p className="stat-value">{stats.unpaidInvoiceCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Unpaid total</p>
          <p className="stat-value">${stats.unpaidInvoiceTotal}</p>
        </div>
      </section>

      <section className="card-dashboard flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Quick links</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jump straight to the thing you need.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/products" className="btn-secondary h-9 px-3 text-xs">
            Products
          </Link>
          <Link href="/clients" className="btn-secondary h-9 px-3 text-xs">
            Clients
          </Link>
          <Link href="/invoices" className="btn-secondary h-9 px-3 text-xs">
            Invoices
          </Link>
          <Link href="/reports" className="btn-secondary h-9 px-3 text-xs">
            Reports
          </Link>
        </div>
      </section>
    </div>
  );
}
