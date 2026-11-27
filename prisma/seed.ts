import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  DEFAULT_COOKING_GUIDES,
  DEFAULT_LANDING_CONTENT,
} from "../src/domain/content-defaults";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./seed-catalog";

const prisma = new PrismaClient();

async function main() {
  for (const cat of SEED_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  const catMap = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );

  const validSlugs = new Set(SEED_PRODUCTS.map((p) => p.slug));
  for (const p of SEED_PRODUCTS) {
    const categoryId = catMap.get(p.catSlug)!;
    const { catSlug: _, ...data } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...data, categoryId },
      create: { ...data, categoryId },
    });
  }

  // Clean up obsolete legacy demo products/categories that have no order history
  const obsoleteProducts = await prisma.product.findMany({
    where: {
      slug: { notIn: Array.from(validSlugs) },
      orderItems: { none: {} },
    },
    select: { id: true },
  });
  if (obsoleteProducts.length > 0) {
    await prisma.product.deleteMany({
      where: { id: { in: obsoleteProducts.map((o) => o.id) } },
    });
  }
  const validCatSlugs = SEED_CATEGORIES.map((c) => c.slug);
  await prisma.category.deleteMany({
    where: {
      slug: { notIn: validCatSlugs },
      products: { none: {} },
    },
  });

  const setProd = await prisma.product.findUniqueOrThrow({
    where: { slug: "best-seller-set-4" },
  });
  const childSlugs = [
    "pork-chop-kp",
    "tender-pork-big",
    "chicken-steak-big",
    "easy-clean-chicken-p",
  ];
  for (const slug of childSlugs) {
    const child = await prisma.product.findUniqueOrThrow({ where: { slug } });
    await prisma.bundleItem.upsert({
      where: {
        parentProductId_childProductId: {
          parentProductId: setProd.id,
          childProductId: child.id,
        },
      },
      update: { quantity: 1 },
      create: {
        parentProductId: setProd.id,
        childProductId: child.id,
        quantity: 1,
      },
    });
  }

  const existingSetting = await prisma.storeSetting.findUnique({
    where: { id: "default" },
  });
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update:
      existingSetting?.lineId === "@steakboss"
        ? {
            lineId: "@831uzirg",
            lineOaUrl: "https://line.me/R/ti/p/@831uzirg",
          }
        : {},
    create: {
      id: "default",
      wholesaleMinPacks: 10,
      lineId: "@831uzirg",
      lineOaUrl: "https://line.me/R/ti/p/@831uzirg",
    },
  });

  const { badges, ...landingRest } = DEFAULT_LANDING_CONTENT;
  await prisma.landingContent.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      ...landingRest,
      badgesJson: JSON.stringify(badges),
    },
  });

  for (const guide of DEFAULT_COOKING_GUIDES) {
    const { steps, tips, ...guideRest } = guide;
    await prisma.cookingGuide.upsert({
      where: { slug: guide.slug },
      update: {},
      create: {
        ...guideRest,
        stepsJson: JSON.stringify(steps),
        tipsJson: JSON.stringify(tips),
      },
    });
  }

  await prisma.coupon.upsert({
    where: { code: "BOSS50" },
    update: {},
    create: {
      code: "BOSS50",
      type: "FIXED",
      value: 50,
      minSubtotal: 300,
      isActive: true,
    },
  });

  const accounts = [
    {
      email: "owner@steakboss.local",
      name: "เจ้าของร้าน Steakboss",
      role: "OWNER",
      pass: "boss1234",
    },
    {
      email: "admin@steakboss.local",
      name: "แอดมินตอบแชท",
      role: "ADMIN",
      pass: "admin1234",
    },
    {
      email: "packer@steakboss.local",
      name: "ทีมแพ็คห้องเย็น",
      role: "PACKER",
      pass: "pack1234",
    },
    {
      email: "wholesale@steakboss.local",
      name: "ตัวแทนขายส่ง Steakboss",
      role: "WHOLESALE",
      pass: "whole1234",
    },
  ];
  for (const s of accounts) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: s.role },
      create: {
        email: s.email,
        name: s.name,
        role: s.role,
        passwordHash: hashPassword(s.pass),
      },
    });
  }

  console.log(
    `Seed completed: ${SEED_PRODUCTS.length} products across ${SEED_CATEGORIES.length} categories.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
