import { PageHeader } from "@/components/PageHeader";
import { ProductCreateForm } from "@/components/ProductCreateForm";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="content-stack">
      <PageHeader kicker="Inventory" title="New product" />
      <ProductCreateForm />
    </div>
  );
}
