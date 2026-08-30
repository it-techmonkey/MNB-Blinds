-- Record warehouse count corrections without changing purchase/restock history.
CREATE TYPE "StockAdjustmentType" AS ENUM ('INCREASE', 'DECREASE');
CREATE TYPE "StockAdjustmentReason" AS ENUM ('MISSING', 'FOUND', 'MISPLACED', 'COUNTING_ERROR', 'OTHER');

CREATE TABLE "product_stock_adjustments" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "StockAdjustmentType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_stock_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_stock_adjustments_product_id_idx" ON "product_stock_adjustments"("product_id");

ALTER TABLE "product_stock_adjustments" ADD CONSTRAINT "product_stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
