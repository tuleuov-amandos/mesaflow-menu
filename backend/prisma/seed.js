import { PrismaClient } from '@prisma/client';
import { STORE, CATEGORIES, PRODUCTS } from '../../src/data.js';

const prisma = new PrismaClient();

const RESTAURANT_SLUG = 'beco-da-chapa';

function toCents(value) {
  return Math.round(value * 100);
}

function prepTimeToMinutes(prepTime) {
  if (!prepTime) return null;
  const match = String(prepTime).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function buildBadges(product) {
  if (!product.badge) return null;
  return { label: product.badge, type: product.badgeType ?? null };
}

function buildCustomizationConfig(product) {
  if (product.customizations) return product.customizations;
  if (product.drinkOptions) return { drinkOptions: product.drinkOptions };
  return null;
}

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: {
      name: STORE.name,
      phone: STORE.phone,
      whatsapp: STORE.whatsapp,
      deliveryFeeCents: toCents(STORE.deliveryFee),
      minimumOrderCents: toCents(STORE.minOrder),
    },
    create: {
      name: STORE.name,
      slug: RESTAURANT_SLUG,
      phone: STORE.phone,
      whatsapp: STORE.whatsapp,
      deliveryFeeCents: toCents(STORE.deliveryFee),
      minimumOrderCents: toCents(STORE.minOrder),
    },
  });

  const menuCategories = CATEGORIES.filter((category) => category.id !== 'all');
  const categoryIdBySlug = new Map();

  for (const [index, category] of menuCategories.entries()) {
    const record = await prisma.category.upsert({
      where: {
        restaurantId_slug: { restaurantId: restaurant.id, slug: category.id },
      },
      update: { name: category.label, sortOrder: index, active: true },
      create: {
        restaurantId: restaurant.id,
        name: category.label,
        slug: category.id,
        sortOrder: index,
        active: true,
      },
    });
    categoryIdBySlug.set(category.id, record.id);
  }

  for (const product of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(product.category);
    if (!categoryId) {
      throw new Error(`Категория "${product.category}" не найдена для позиции ${product.name}.`);
    }

    const data = {
      restaurantId: restaurant.id,
      categoryId,
      name: product.name,
      description: product.description ?? null,
      priceCents: toCents(product.price),
      imagePath: product.image ?? null,
      prepTimeMinutes: prepTimeToMinutes(product.prepTime),
      badges: buildBadges(product),
      customizationConfig: buildCustomizationConfig(product),
      active: product.available !== false,
      featured: Boolean(product.featured),
    };

    await prisma.product.upsert({
      where: {
        restaurantId_externalId: {
          restaurantId: restaurant.id,
          externalId: String(product.id),
        },
      },
      update: data,
      create: { ...data, externalId: String(product.id) },
    });
  }

  const productCount = await prisma.product.count({ where: { restaurantId: restaurant.id } });
  console.log(`Сидирование завершено: ${restaurant.name} · категорий: ${menuCategories.length} · позиций: ${productCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
