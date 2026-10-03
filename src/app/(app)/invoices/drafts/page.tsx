import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteDraftButton } from "@/components/DeleteDraftButton";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";
import { serializeDraft } from "@/server/serialize";
import { listDrafts } from "@/server/services/draft.service";

export default async function DraftsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const drafts = (await listDrafts()).map(serializeDraft);

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Sales"
        title="Saved drafts"
        subtitle="Orders saved for later. Nothing here is invoiced, and no stock is held until you create the invoice."
        actions={
          <Link href="/invoices" className="btn-secondary w-full lg:w-auto">
            Back to invoices
          </Link>
        }
      />

      {drafts.length === 0 ? (
        <div className="card-dashboard flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">No saved drafts</p>
          <p className="mt-2 text-sm text-muted-foreground">Use &ldquo;Save for later&rdquo; on a new invoice to keep a quote here.</p>
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full min-w-175 text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Saved</th>
                <th className="px-3 py-3 text-right font-medium">Lines</th>
                <th className="px-3 py-3 text-right font-medium">Total when saved</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} className="table-row">
                  <td className="px-3 py-3 font-semibold text-foreground">{d.clientName}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(d.updatedAt).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{d.items.length}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">${d.totalAmount}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <Link href={`/invoices/new?draftId=${d.id}`} className="mr-4 text-xs font-semibold text-primary hover:underline">
                      Open
                    </Link>
                    <DeleteDraftButton draftId={d.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
