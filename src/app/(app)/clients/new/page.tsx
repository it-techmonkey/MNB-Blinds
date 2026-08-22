import { PageHeader } from "@/components/PageHeader";
import { ClientCreateForm } from "@/components/ClientCreateForm";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";

export default async function NewClientPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="content-stack">
      <PageHeader kicker="Accounts" title="New client" />
      <ClientCreateForm />
    </div>
  );
}
