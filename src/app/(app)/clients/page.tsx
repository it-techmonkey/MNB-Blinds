import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { listClientsAdmin } from "@/server/services/client.service";
import { redirect } from "next/navigation";

export default async function ClientsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const clients = await listClientsAdmin();

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Accounts"
        title="Clients"
        subtitle="Client codes, contact details, and lifetime invoice totals."
        actions={
          <Link href="/clients/new" className="btn-primary w-full shrink-0 lg:w-auto">
            Add client
          </Link>
        }
      />

      <section className="table-shell overflow-x-auto">
        {clients.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-muted-foreground">No clients yet.</p>
        ) : (
          <table className="w-full min-w-175 text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Invoices</th>
                <th className="px-4 py-3 text-right font-medium">Lifetime value</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.invoiceCount}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">${c.totalSpent}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.isActive ? "badge-paid" : "badge-neutral"}`}>{c.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/clients/${c.id}`} className="mr-3 text-xs font-semibold text-primary hover:underline">View</Link>
                    <Link href={`/clients/${c.id}?edit=1`} className="text-xs font-semibold text-primary hover:underline">Edit</Link>
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
