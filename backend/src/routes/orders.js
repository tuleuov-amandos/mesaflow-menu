import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const FREE_DELIVERY_ABOVE_CENTS = 8000;

const orderSchema = z
  .object({
    customer: z.object({
      name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
      phone: z.string().trim().min(8, 'Telefone é obrigatório.').max(30),
    }),
    fulfillment: z.enum(['DELIVERY', 'PICKUP']),
    address: z
      .object({ text: z.string().trim().max(200).optional() })
      .partial()
      .optional(),
    payment: z.object({
      method: z.enum(['PIX', 'CARD', 'CASH']),
      changeForCents: z.number().int().positive().nullable().optional(),
    }),
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(
        z.object({
          externalProductId: z.string().trim().min(1),
          quantity: z.number().int().min(1).max(20),
          customizations: z
            .object({
              removes: z.array(z.string()).optional(),
              extras: z.array(z.string()).optional(),
              meatPoint: z.string().nullable().optional(),
              drinkChoice: z.string().nullable().optional(),
            })
            .passthrough()
            .optional(),
        }),
      )
      .min(1, 'O pedido precisa de pelo menos 1 item.'),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment === 'DELIVERY' && !data.address?.text?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['address', 'text'], message: 'Endereço é obrigatório para entrega.' });
    }
    if (data.payment.method !== 'CASH' && data.payment.changeForCents != null) {
      ctx.addIssue({ code: 'custom', path: ['payment', 'changeForCents'], message: 'Troco só se aplica a pagamento em dinheiro.' });
    }
  });

function generatePublicCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MF-${suffix}`;
}

function extraPriceMap(customizationConfig) {
  const map = new Map();
  const extras = customizationConfig?.extras;
  if (Array.isArray(extras)) {
    for (const extra of extras) {
      if (extra?.label != null && typeof extra.price === 'number') {
        map.set(extra.label, Math.round(extra.price * 100));
      }
    }
  }
  return map;
}

router.post('/restaurants/:slug/orders', async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Dados inválidos.', issues: parsed.error.issues });
    }
    const payload = parsed.data;

    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante não encontrado.' });
    }

    const externalIds = payload.items.map((item) => item.externalProductId);
    const products = await prisma.product.findMany({
      where: { restaurantId: restaurant.id, externalId: { in: externalIds }, active: true },
    });
    const productByExternalId = new Map(products.map((p) => [p.externalId, p]));

    const itemsData = [];
    let subtotalCents = 0;

    for (const item of payload.items) {
      const product = productByExternalId.get(item.externalProductId);
      if (!product) {
        return res.status(422).json({ error: `Produto indisponível: ${item.externalProductId}.` });
      }

      const prices = extraPriceMap(product.customizationConfig);
      const chosenExtras = item.customizations?.extras ?? [];
      const extraCents = chosenExtras.reduce((sum, label) => sum + (prices.get(label) ?? 0), 0);

      const unitPriceCents = product.priceCents + extraCents;
      const lineTotalCents = unitPriceCents * item.quantity;
      subtotalCents += lineTotalCents;

      itemsData.push({
        productId: product.id,
        productName: product.name,
        unitPriceCents,
        quantity: item.quantity,
        customizations: item.customizations ?? null,
        lineTotalCents,
      });
    }

    if (subtotalCents < restaurant.minimumOrderCents) {
      return res.status(422).json({
        error: `Pedido mínimo de R$ ${(restaurant.minimumOrderCents / 100).toFixed(2)}.`,
      });
    }

    const deliveryFeeCents =
      payload.fulfillment === 'DELIVERY' && subtotalCents < FREE_DELIVERY_ABOVE_CENTS
        ? restaurant.deliveryFeeCents
        : 0;
    const totalCents = subtotalCents + deliveryFeeCents;

    let order = null;
    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
      try {
        order = await prisma.order.create({
          data: {
            restaurantId: restaurant.id,
            publicCode: generatePublicCode(),
            fulfillmentType: payload.fulfillment,
            paymentMethod: payload.payment.method,
            customerName: payload.customer.name,
            customerPhone: payload.customer.phone,
            address: payload.fulfillment === 'DELIVERY' ? payload.address?.text ?? null : null,
            changeForCents: payload.payment.method === 'CASH' ? payload.payment.changeForCents ?? null : null,
            notes: payload.notes ?? null,
            subtotalCents,
            deliveryFeeCents,
            totalCents,
            items: { create: itemsData },
            history: { create: { status: 'NEW' } },
          },
        });
      } catch (error) {
        if (error?.code === 'P2002') continue;
        throw error;
      }
    }

    if (!order) {
      return res.status(500).json({ error: 'Não foi possível gerar o código do pedido.' });
    }

    res.status(201).json({
      order: {
        publicCode: order.publicCode,
        status: order.status,
        totalCents: order.totalCents,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
