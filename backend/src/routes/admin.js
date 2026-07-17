import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAdmin } from '../middlewares/require-admin.js';
import { ORDER_STATUSES, STATUS_LABELS, isValidStatus, canTransition, nextStatuses } from '../lib/order-status.js';

const router = Router();
const prisma = new PrismaClient();

const TOKEN_TTL = '2h';

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function rateLimitLogin(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.start > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, start: now });
    return next();
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Слишком много попыток. Подождите несколько минут.' });
  }
  entry.count += 1;
  next();
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

router.post('/login', rateLimitLogin, (req, res) => {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!password || !secret) {
    return res.status(503).json({ error: 'Панель администрирования недоступна.' });
  }

  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success || !safeEqual(parsed.data.password, password)) {
    return res.status(401).json({ error: 'Неверный пароль.' });
  }

  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: TOKEN_TTL });
  res.json({ token, expiresIn: TOKEN_TTL });
});

function serializeSummaryOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    publicCode: order.publicCode,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    totalCents: order.totalCents,
  };
}

router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const statusFilter = typeof req.query.status === 'string' && isValidStatus(req.query.status)
      ? req.query.status
      : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where = {};
    if (statusFilter) where.status = statusFilter;
    if (q) {
      const or = [
        { publicCode: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
      const numeric = q.replace(/^#/, '');
      if (/^\d+$/.test(numeric) && Number(numeric) <= 2147483647) {
        or.push({ orderNumber: Number(numeric) });
      }
      where.OR = or;
    }

    const [orders, grouped] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
    res.json({
      orders: orders.map(serializeSummaryOrder),
      summary: {
        novos: counts.NEW ?? 0,
        emPreparo: counts.PREPARING ?? 0,
        finalizados: counts.FINALIZED ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден.' });
    }

    res.json({
      order: {
        ...serializeSummaryOrder(order),
        address: order.address,
        changeForCents: order.changeForCents,
        etaMinutes: order.etaMinutes,
        notes: order.notes,
        subtotalCents: order.subtotalCents,
        deliveryFeeCents: order.deliveryFeeCents,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
          customizations: item.customizations,
        })),
        history: order.history.map((h) => ({
          status: h.status,
          statusLabel: STATUS_LABELS[h.status] ?? h.status,
          note: h.note,
          etaMinutes: h.etaMinutes,
          createdAt: h.createdAt,
        })),
        nextStatuses: nextStatuses(order.status, order.fulfillmentType),
      },
    });
  } catch (error) {
    next(error);
  }
});

const DEFAULT_ETA_MINUTES = 35;

const statusPatchSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  etaMinutes: z.number().int().min(5).max(180).optional(),
  note: z.string().trim().min(1).max(300).optional(),
});

router.patch('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const parsed = statusPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Некорректные данные.', issues: parsed.error.issues });
    }
    const { status: target, etaMinutes, note } = parsed.data;

    const current = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!current) {
      return res.status(404).json({ error: 'Заказ не найден.' });
    }
    if (current.status === target) {
      return res.status(409).json({ error: 'Заказ уже находится в этом статусе.' });
    }
    if (!canTransition(current.status, target, current.fulfillmentType)) {
      return res.status(409).json({
        error: `Переход недопустим: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[target]}.`,
      });
    }
    if (target === 'CANCELED' && !note) {
      return res.status(422).json({ error: 'Причина отмены обязательна.' });
    }

    const orderData = { status: target };
    const historyData = { orderId: current.id, status: target };
    if (target === 'CONFIRMED') {
      const eta = etaMinutes ?? DEFAULT_ETA_MINUTES;
      orderData.etaMinutes = eta;
      historyData.etaMinutes = eta;
    }
    if (target === 'CANCELED') {
      historyData.note = note;
    }

    const [updated] = await prisma.$transaction([
      prisma.order.update({ where: { id: current.id }, data: orderData }),
      prisma.orderStatusHistory.create({ data: historyData }),
    ]);

    res.json({
      order: {
        id: updated.id,
        status: updated.status,
        statusLabel: STATUS_LABELS[updated.status] ?? updated.status,
        etaMinutes: updated.etaMinutes,
        nextStatuses: nextStatuses(updated.status, updated.fulfillmentType),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
