import type { Prisma } from "@prisma/client";

export async function saveDefaultCustomerAddressInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    postalCode: string;
  }
): Promise<void> {
  const cleanAddress = params.addressLine.trim();
  const cleanPostal = params.postalCode.trim();
  if (!cleanAddress || !cleanPostal) return;

  await tx.address.updateMany({
    where: { userId: params.userId },
    data: { isDefault: false },
  });

  const existingAddr = await tx.address.findFirst({
    where: { userId: params.userId },
    orderBy: { isDefault: "desc" },
  });

  if (existingAddr) {
    await tx.address.update({
      where: { id: existingAddr.id },
      data: {
        recipientName: params.recipientName,
        phone: params.phone,
        addressLine: cleanAddress,
        postalCode: cleanPostal,
        isDefault: true,
      },
    });
  } else {
    await tx.address.create({
      data: {
        userId: params.userId,
        label: "ที่อยู่จัดส่งหลัก",
        recipientName: params.recipientName,
        phone: params.phone,
        addressLine: cleanAddress,
        postalCode: cleanPostal,
        isDefault: true,
      },
    });
  }
}
