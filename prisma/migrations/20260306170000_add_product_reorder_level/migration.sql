ALTER TABLE "Product"
ADD COLUMN "reorderLevel" INTEGER NOT NULL DEFAULT 10;

UPDATE "InventoryStock" AS s
SET "reorderLevel" = p."reorderLevel"
FROM "Variant" AS v
JOIN "Product" AS p ON p."id" = v."productId"
WHERE s."variantId" = v."id";
