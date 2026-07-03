-- Número de pedido humano (#1001...) por restaurante, aditivo e seguro.
ALTER TABLE "Restaurant" ADD COLUMN "nextOrderNumber" INTEGER NOT NULL DEFAULT 1001;

-- Coluna nullable primeiro para permitir backfill dos pedidos existentes.
ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER;

-- Backfill: numera pedidos existentes por restaurante, em ordem de createdAt,
-- começando em 1001. Não altera publicCode nem qualquer outro dado do pedido.
WITH numbered AS (
  SELECT
    id,
    1000 + ROW_NUMBER() OVER (PARTITION BY "restaurantId" ORDER BY "createdAt" ASC, id ASC) AS num
  FROM "Order"
)
UPDATE "Order" o
SET "orderNumber" = n.num
FROM numbered n
WHERE o.id = n.id;

-- nextOrderNumber de cada restaurante aponta para o próximo número livre.
UPDATE "Restaurant" r
SET "nextOrderNumber" = COALESCE(
  (SELECT MAX(o."orderNumber") + 1 FROM "Order" o WHERE o."restaurantId" = r.id),
  1001
);

-- Agora que todos têm número, torna obrigatório e único por restaurante.
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Order_restaurantId_orderNumber_key" ON "Order"("restaurantId", "orderNumber");
