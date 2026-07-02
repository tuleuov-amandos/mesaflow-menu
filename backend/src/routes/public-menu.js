import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/restaurants/:slug/menu', async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: req.params.slug },
      include: {
        categories: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              where: { active: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante não encontrado.' });
    }

    res.json({
      restaurant: {
        name: restaurant.name,
        slug: restaurant.slug,
        phone: restaurant.phone,
        whatsapp: restaurant.whatsapp,
        deliveryFeeCents: restaurant.deliveryFeeCents,
        minimumOrderCents: restaurant.minimumOrderCents,
      },
      categories: restaurant.categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
        products: category.products.map((product) => ({
          externalId: product.externalId,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          imagePath: product.imagePath,
          prepTimeMinutes: product.prepTimeMinutes,
          badges: product.badges,
          featured: product.featured,
          customizationConfig: product.customizationConfig,
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
