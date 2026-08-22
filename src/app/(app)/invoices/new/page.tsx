import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NewInvoiceClient } from "@/components/NewInvoiceClient";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";

export default async function NewInvoicePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Sales"
        title="New invoice"
        subtitle="Choose a client, enter quantities, and submit. Stock updates immediately."
        actions={
          <Link href="/invoices" className="btn-secondary w-full lg:w-auto">
            Back to invoices
          </Link>
        }
      />
      <Suspense
        fallback={
          <div className="table-shell p-4">
            <div className="skeleton-bar" />
          </div>
        }
      >
        <NewInvoiceClient />
      </Suspense>
    </div>
  );
}
