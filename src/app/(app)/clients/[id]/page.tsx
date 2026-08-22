import { PageHeader } from "@/components/PageHeader";
import { ClientDetailBody } from "@/components/ClientDetailBody";
import { getSession } from "@/lib/auth/get-session";
import { getClientById, getClientInvoiceHistory } from "@/server/services/client.service";
import { serializeInvoiceRow } from "@/server/serialize";
import { redirect, notFound } from "next/navigation";
import { NotFoundError } from "@/server/errors";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  let client;
  let invoices;
  try {
    [client, invoices] = await Promise.all([getClientById(id), getClientInvoiceHistory(id)]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="content-stack">
      <PageHeader kicker="Accounts" title={client.name} subtitle={`Code ${client.code}`} />
      <ClientDetailBody client={client} invoices={invoices.map(serializeInvoiceRow)} />
    </div>
  );
}
