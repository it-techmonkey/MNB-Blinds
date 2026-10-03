-- Saved-for-later orders: editable and deletable, unlike invoices. They reserve no stock and never count toward sales.
CREATE TABLE "invoice_drafts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_draft_items" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_draft_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_drafts_client_id_idx" ON "invoice_drafts"("client_id");
CREATE INDEX "invoice_drafts_updated_at_idx" ON "invoice_drafts"("updated_at");
CREATE INDEX "invoice_draft_items_draft_id_idx" ON "invoice_draft_items"("draft_id");
CREATE INDEX "invoice_draft_items_product_id_idx" ON "invoice_draft_items"("product_id");

ALTER TABLE "invoice_drafts" ADD CONSTRAINT "invoice_drafts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_draft_items" ADD CONSTRAINT "invoice_draft_items_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "invoice_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_draft_items" ADD CONSTRAINT "invoice_draft_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
