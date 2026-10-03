-- Freeze each line's unit at the time of sale. Existing lines are backfilled from the product's current unit.
ALTER TABLE "invoice_items" ADD COLUMN "unit_snapshot" TEXT;
ALTER TABLE "invoice_items" ADD COLUMN "unit_detail_snapshot" TEXT;

UPDATE "invoice_items" ii
SET "unit_snapshot" = p."unit", "unit_detail_snapshot" = p."unit_detail"
FROM "products" p
WHERE p."id" = ii."product_id";
