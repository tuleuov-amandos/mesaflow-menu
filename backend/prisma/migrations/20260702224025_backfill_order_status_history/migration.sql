-- Backfill idempotente: garante um evento inicial NEW na timeline de cada
-- pedido pré-existente que ainda não possui histórico. Usa a data do pedido
-- para manter a ordem correta. Reexecuções não duplicam (NOT EXISTS).
INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "createdAt")
SELECT
    gen_random_uuid()::text,
    o."id",
    'NEW'::"OrderStatus",
    o."createdAt"
FROM "Order" o
WHERE NOT EXISTS (
    SELECT 1 FROM "OrderStatusHistory" h WHERE h."orderId" = o."id"
);
