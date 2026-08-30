import { PageHeader } from "@/components/PageHeader";
import { ProductDetailBody } from "@/components/ProductDetailBody";
import { getSession } from "@/lib/auth/get-session";
import { getProductById, getProductRestocks, getProductStockAdjustments } from "@/server/services/product.service";
import { redirect, notFound } from "next/navigation";
import { NotFoundError } from "@/server/errors";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> };

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { edit } = await searchParams;
  let product;
  try {
    [product] = await Promise.all([getProductById(id)]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const [restocks, stockAdjustments] = await Promise.all([getProductRestocks(id), getProductStockAdjustments(id)]);

  return (
    <div className="content-stack">
      <PageHeader kicker="Inventory" title={product.name} subtitle={`Code ${product.code}`} />
      <ProductDetailBody product={product} restocks={restocks} stockAdjustments={stockAdjustments} autoOpenEdit={edit === "1"} />
    </div>
  );
}
