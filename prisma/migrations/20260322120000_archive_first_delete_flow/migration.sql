-- AlterTable
ALTER TABLE "Variant" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN "productIdSnapshot" TEXT,
ADD COLUMN "productNameSnapshot" TEXT;

-- Backfill product snapshot data for rows that still have a live variant relation.
UPDATE "OrderItem" AS oi
SET
  "productIdSnapshot" = p."id",
  "productNameSnapshot" = p."name"
FROM "Variant" AS v
JOIN "Product" AS p ON p."id" = v."productId"
WHERE
  oi."variantId" = v."id"
  AND (oi."productIdSnapshot" IS NULL OR oi."productNameSnapshot" IS NULL);
