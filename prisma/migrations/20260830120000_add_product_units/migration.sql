-- Add product-level unit information. Both columns are nullable so existing products remain valid.
ALTER TABLE "products" ADD COLUMN "unit" TEXT;
ALTER TABLE "products" ADD COLUMN "unit_detail" TEXT;
