-- MesaFlow Operação v1.5 — migration aditiva e segura para pedidos existentes.
-- Enum: adiciona OUT_FOR_DELIVERY e renomeia DELIVERED -> FINALIZED (preserva linhas).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY' AFTER 'READY';
ALTER TYPE "OrderStatus" RENAME VALUE 'DELIVERED' TO 'FINALIZED';

-- Previsão de preparo no pedido (opcional).
ALTER TABLE "Order" ADD COLUMN "etaMinutes" INTEGER;

-- Histórico ganha nota/motivo e previsão opcionais (append-only preservado).
ALTER TABLE "OrderStatusHistory" ADD COLUMN "note" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN "etaMinutes" INTEGER;
