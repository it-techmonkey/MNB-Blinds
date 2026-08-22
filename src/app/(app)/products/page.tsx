import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listAllProductsAdmin } from "@/server/services/product.service";
import { redirect } from "next/navigation";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const products = await listAllProductsAdmin();
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Inventory"
        title="Products"
        subtitle="Track purchasing cost and live stock for every product."
        actions={
          <Link href="/products/new" className="btn-primary w-full shrink-0 lg:w-auto">
            Add product
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">Active / total products</p>
          <p className="stat-value">
            {activeCount} / {products.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total stock units</p>
          <p className="stat-value">{totalStock}</p>
        </div>
      </section>

      <section className="table-shell overflow-x-auto">
        {products.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <table className="w-full min-w-150 text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Current cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link href={`/products/${p.id}`} className="hover:underline">
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stock}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">${p.currentCost}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.isActive ? "badge-paid" : "badge-neutral"}`}>{p.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/products/${p.id}?edit=1`} className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
