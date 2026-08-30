import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listAllProductsAdmin } from "@/server/services/product.service";
import { redirect } from "next/navigation";

type SortField = "code" | "name" | "stock" | "cost";
type SortDirection = "asc" | "desc";

const sortLabels: Record<SortField, string> = {
  code: "Code",
  name: "Name",
  stock: "Stock",
  cost: "Current cost",
};

function isSortField(value: string | undefined): value is SortField {
  return value === "code" || value === "name" || value === "stock" || value === "cost";
}

function sortProducts<T extends { code: string; name: string; stock: number; currentCost: string }>(
  products: T[],
  field: SortField,
  direction: SortDirection
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  return [...products].sort((a, b) => {
    if (field === "stock") return (a.stock - b.stock) * multiplier;
    if (field === "cost") return (Number(a.currentCost) - Number(b.currentCost)) * multiplier;
    return textCollator.compare(a[field], b[field]) * multiplier;
  });
}

function SortHeader({ field, label, activeField, direction }: { field: SortField; label: string; activeField: SortField; direction: SortDirection }) {
  const isActive = field === activeField;
  const nextDirection: SortDirection = isActive && direction === "asc" ? "desc" : "asc";
  const symbol = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <Link
      href={`/products?sort=${field}&direction=${nextDirection}`}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={`Sort by ${label}, ${nextDirection === "asc" ? "ascending" : "descending"}`}
      title={`Sort by ${label}`}
    >
      {label}
      <span aria-hidden="true" className={isActive ? "text-foreground" : "text-muted-foreground"}>
        {symbol}
      </span>
    </Link>
  );
}

type Props = { searchParams: Promise<{ sort?: string; direction?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const sortField = isSortField(query.sort) ? query.sort : "name";
  const sortDirection: SortDirection = query.direction === "desc" ? "desc" : "asc";
  const products = sortProducts(await listAllProductsAdmin(), sortField, sortDirection);
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
                <th className="px-4 py-3 font-medium">
                  <SortHeader field="code" label={sortLabels.code} activeField={sortField} direction={sortDirection} />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader field="name" label={sortLabels.name} activeField={sortField} direction={sortDirection} />
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <SortHeader field="stock" label={sortLabels.stock} activeField={sortField} direction={sortDirection} />
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <SortHeader field="cost" label={sortLabels.cost} activeField={sortField} direction={sortDirection} />
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                    <Link href={`/products/${p.id}`} className="mr-3 text-xs font-semibold text-primary hover:underline">
                      View
                    </Link>
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
