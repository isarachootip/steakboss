import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  DEFAULT_COOKING_GUIDES,
  DEFAULT_LANDING_CONTENT,
} from "../src/domain/content-defaults";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./seed-catalog";

const prisma = new PrismaClient();

const LEGACY_DEMO_PRODUCT_SLUGS = ["chicken-steak-premium"];
const LEGACY_DEMO_CATEGORY_SLUGS = ["clean", "premium"];

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

  const existingImagesBySlug = new Map(
    (
      await prisma.product.findMany({
        select: { slug: true, platedImgUrl: true, packImgUrl: true, wideImgUrl: true },
      })
    ).map((row) => [row.slug, row])
  );
  const isCustomImage = (url: string | null | undefined): boolean =>
    Boolean(url && !url.startsWith("/images/products/"));

  for (const p of SEED_PRODUCTS) {
    const categoryId = catMap.get(p.catSlug)!;
    const { catSlug: _, stockQty, costBaht, ...restData } = p;
    const prev = existingImagesBySlug.get(p.slug);
    const updateData = {
      ...restData,
      categoryId,
      platedImgUrl: isCustomImage(prev?.platedImgUrl)
        ? prev!.platedImgUrl
        : restData.platedImgUrl,
      packImgUrl: isCustomImage(prev?.packImgUrl)
        ? prev!.packImgUrl
        : restData.packImgUrl,
      wideImgUrl: isCustomImage(prev?.wideImgUrl)
        ? prev!.wideImgUrl
        : restData.wideImgUrl,
    };
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: updateData,
      create: { ...restData, stockQty, costBaht, categoryId },
    });
  }

  // Safely retire legacy demo SKU without touching admin-created items or breaking order history
  for (const legacySlug of LEGACY_DEMO_PRODUCT_SLUGS) {
    const legacy = await prisma.product.findUnique({
      where: { slug: legacySlug },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!legacy) continue;
    if (legacy._count.orderItems === 0) {
      await prisma.product.delete({ where: { id: legacy.id } });
    } else {
      await prisma.product.update({
        where: { id: legacy.id },
        data: { isActive: false },
      });
    }
  }

  await prisma.category.deleteMany({
    where: {
      slug: { in: LEGACY_DEMO_CATEGORY_SLUGS },
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
  const settingUpdate: Record<string, string> = {};
  if (existingSetting?.lineId === "@steakboss") {
    settingUpdate.lineId = "@831uzirg";
    settingUpdate.lineOaUrl = "https://line.me/R/ti/p/@831uzirg";
  }
  if (existingSetting?.promptpayId === "0812345678") {
    settingUpdate.promptpayId = "0932896292";
  }
  if (existingSetting?.promptpayName === "บจก. สเต็กบอสส์ต้นตำรับ") {
    settingUpdate.promptpayName = "วรัป เจริญโพธิ์";
  }
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: settingUpdate,
    create: {
      id: "default",
      wholesaleMinPacks: 10,
      lineId: "@831uzirg",
      lineOaUrl: "https://line.me/R/ti/p/@831uzirg",
      promptpayId: "0932896292",
      promptpayName: "วรัป เจริญโพธิ์",
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

  const existingSlideCount = await prisma.heroSlide.count();
  if (existingSlideCount === 0) {
    await prisma.heroSlide.create({
      data: {
        mode: "TEXT_OVERLAY",
        title: DEFAULT_LANDING_CONTENT.heroImgAlt,
        imageUrl: DEFAULT_LANDING_CONTENT.heroImgUrl,
        eyebrow: DEFAULT_LANDING_CONTENT.eyebrow,
        headline: DEFAULT_LANDING_CONTENT.headline,
        subheadline: DEFAULT_LANDING_CONTENT.subheadline,
        packCardImgUrl: DEFAULT_LANDING_CONTENT.packCardImgUrl,
        packCardCaption: DEFAULT_LANDING_CONTENT.packCardCaption,
        badgesJson: JSON.stringify(badges),
        primaryCtaLabel: DEFAULT_LANDING_CONTENT.primaryCtaLabel,
        primaryCtaHref: DEFAULT_LANDING_CONTENT.primaryCtaHref,
        secondaryCtaLabel: DEFAULT_LANDING_CONTENT.secondaryCtaLabel,
        secondaryCtaHref: DEFAULT_LANDING_CONTENT.secondaryCtaHref,
        linkHref: "",
        sortOrder: 0,
        isActive: true,
      },
    });
  }

  await prisma.eventPopup.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      isActive: false,
      title: "",
      imageUrl: "",
      linkHref: "",
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
