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
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
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
    return res.status(503).json({ error: 'Painel administrativo indisponível.' });
  }

  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success || !safeEqual(parsed.data.password, password)) {
    return res.status(401).json({ error: 'Senha inválida.' });
  }

  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: TOKEN_TTL });
  res.json({ token, expiresIn: TOKEN_TTL });
});

function serializeSummaryOrder(order) {
  return {
    id: order.id,
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
      where.OR = [
        { publicCode: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
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
        finalizados: counts.DELIVERED ?? 0,
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
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    res.json({
      order: {
        ...serializeSummaryOrder(order),
        address: order.address,
        changeForCents: order.changeForCents,
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
          createdAt: h.createdAt,
        })),
        nextStatuses: nextStatuses(order.status),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(ORDER_STATUSES) }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Status inválido.' });
    }
    const target = parsed.data.status;

    const current = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!current) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    if (current.status === target) {
      return res.status(409).json({ error: 'O pedido já está nesse status.' });
    }
    if (!canTransition(current.status, target)) {
      return res.status(409).json({
        error: `Transição não permitida: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[target]}.`,
      });
    }

    const [updated] = await prisma.$transaction([
      prisma.order.update({ where: { id: current.id }, data: { status: target } }),
      prisma.orderStatusHistory.create({ data: { orderId: current.id, status: target } }),
    ]);

    res.json({
      order: {
        id: updated.id,
        status: updated.status,
        statusLabel: STATUS_LABELS[updated.status] ?? updated.status,
        nextStatuses: nextStatuses(updated.status),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
