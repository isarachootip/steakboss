import { db } from "@/lib/db";
import { listCatalogProducts } from "./product.service";
import { getStoreSettings } from "./settings.service";
import { lookupOrderForTracking } from "./order.service";
import { resolveShippingZone, ZONE_LABELS } from "@/domain/shipping";
import { generateBossBotAiReply } from "./adapters/llm.adapter";
import { pushLineMessage } from "./adapters/line.adapter";

const HANDOFF_REGEX = /แอดมิน|พนักงาน|เจ้าหน้าที่|คุยกับคน|เคลม|สินค้าเสียหาย|ร้องเรียน/;

async function buildRuleReply(text: string): Promise<string> {
  const s = text.toLowerCase();
  const orderMatch = text.toUpperCase().match(/SB\d{6}-[A-Z0-9]{4}/);
  const phone4 = text.replace(/SB\d{6}-[A-Z0-9]{4}/i, "").match(/\d{4}(?!.*\d)/)?.[0];

  if (orderMatch) {
    const orderNo = orderMatch[0];
    if (!phone4) {
      return `ขอเบอร์โทร 4 ตัวท้ายที่ใช้สั่ง ${orderNo} ด้วยครับ เช่น "${orderNo} 1234"`;
    }
    const looked = await lookupOrderForTracking(orderNo, phone4);
    if (!looked.ok) return looked.error;
    const o = looked.order;
    const trackLine = o.trackingNo
      ? `\nขนส่ง: ${o.carrier || "รถเย็น"} เลขพัสดุ ${o.trackingNo}`
      : "";
    return `ออเดอร์ ${o.orderNo}\nสถานะ: ${o.statusLabel}${trackLine}\nยอดรวม ฿${o.totalBaht.toLocaleString("th-TH")}`;
  }

  const settings = await getStoreSettings();
  const postcode = text.match(/\b\d{5}\b/)?.[0];
  if (/ส่ง|ค่าขนส่ง|shipping|ไปรษณีย์/.test(s) && !/ติดตาม|สถานะ|พัสดุ/.test(s)) {
    if (postcode) {
      const z = resolveShippingZone(postcode);
      if (z) {
        const fee = z === "BKK" ? settings.bkkShipBaht : settings.upcShipBaht;
        return `รหัส ${postcode} อยู่โซน${ZONE_LABELS[z]} ค่าส่งรถเย็น ฿${fee} (ส่งฟรีเมื่อซื้อครบ ฿${settings.freeShipThreshold.toLocaleString("th-TH")})`;
      }
    }
    return `ค่าส่งรถเย็น: กทม.และปริมณฑล ฿${settings.bkkShipBaht} · ต่างจังหวัด ฿${settings.upcShipBaht}\nซื้อครบ ฿${settings.freeShipThreshold.toLocaleString("th-TH")} ส่งฟรี · รับเองที่โรงงานอ่างทองฟรีครับ`;
  }

  if (/ติดตาม|สถานะ|พัสดุ|ถึงไหน|track/.test(s)) {
    return 'พิมพ์เลขคำสั่งซื้อและเบอร์ 4 ตัวท้ายได้เลยครับ เช่น "SB261121-AB12 1234"';
  }
  if (/ปรุง|ย่าง|ทอด|ทำยังไง|ละลาย|หม้อทอด/.test(s)) {
    return "ละลายในช่องเย็นข้ามคืน (หรือแช่ทั้งซองในน้ำเย็น 30–40 นาที)\nกระทะไฟกลางค่อนแรง ข้างละ 4–6 นาที หรือหม้อทอดไร้น้ำมัน 180°C 12–15 นาที\nสุกทั่ว ไก่ 74°C หมู 70°C พัก 3 นาทีแล้วเสิร์ฟครับ";
  }
  if (/เก็บ|แช่แข็ง|ฟรีซ/.test(s)) {
    return "เก็บในช่องแช่แข็ง -18°C ครับ ละลายแล้วไม่ควรนำกลับไปแช่แข็งซ้ำ";
  }
  if (/จ่าย|โอน|พร้อมเพย์|ปลายทาง|cod/.test(s)) {
    return `ชำระได้ 2 แบบ: โอนพร้อมเพย์ (${settings.promptpayId}) พร้อมแนบสลิป หรือเก็บเงินปลายทาง (+฿${settings.codFeeBaht}) ครับ`;
  }

  const products = await listCatalogProducts();
  if (/คลีน|ลดน้ำหนัก|โปรตีน|ไดเอท|diet/.test(s)) {
    const clean = products.find((p) => p.categorySlug === "clean") ?? products[0];
    if (clean) {
      return `แนะนำ ${clean.name} ${clean.weightGrams}g ฿${clean.priceBaht} ${clean.subtitle} ย่างคู่สลัดได้เลยครับ`;
    }
  }
  if (/แนะนำ|เมนู|ขายดี|มีอะไร|ราคา/.test(s)) {
    const lines = products.map(
      (p) =>
        `• ${p.name} ${p.weightGrams}g ฿${p.priceBaht}${p.isNew ? " (ใหม่)" : ""}${p.availableStock <= 0 ? " (หมด)" : ""}`
    );
    return `เมนูสเต็กหมักพร้อมย่าง Steakboss ครับ\n${lines.join("\n")}`;
  }

  const sysPrompt = `คุณคือ "บอสบอท" ผู้ช่วยร้าน Steakboss (สเต็กหมักแช่แข็ง -18°C จ.อ่างทอง) ตอบภาษาไทยสุภาพ ลงท้ายครับ สั้นไม่เกิน 5 บรรทัด ห้ามแต่งราคาเอง
สินค้า: ${products.map((p) => `${p.name} ${p.weightGrams}g ฿${p.priceBaht}`).join(", ")}
ค่าส่งรถเย็น: กทม. ฿${settings.bkkShipBaht}, ตจว. ฿${settings.upcShipBaht}, ส่งฟรีเมื่อครบ ฿${settings.freeShipThreshold}, COD +฿${settings.codFeeBaht}`;
  const aiText = await generateBossBotAiReply(sysPrompt, text);
  if (aiText) return aiText;

  return 'ผมช่วยเรื่องเมนู ค่าส่ง ติดตามพัสดุ และวิธีปรุงได้ครับ หรือพิมพ์ "คุยแอดมิน" เพื่อติดต่อทีมงานได้เลยครับ';
}

export async function handleIncomingChatMessage(params: {
  channel: "WEB" | "LINE";
  externalId: string;
  customerName?: string;
  content: string;
  userId?: string;
}) {
  const cleanContent = params.content.trim();
  const thread = await db.chatThread.upsert({
    where: {
      channel_externalId: {
        channel: params.channel,
        externalId: params.externalId,
      },
    },
    update: {
      lastMessageAt: new Date(),
      ...(params.customerName ? { customerName: params.customerName } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    },
    create: {
      channel: params.channel,
      externalId: params.externalId,
      customerName:
        params.customerName ||
        (params.channel === "LINE" ? "ลูกค้า LINE OA" : "ลูกค้าหน้าร้าน"),
      userId: params.userId ?? null,
      mode: "BOT",
    },
  });

  await db.chatMessage.create({
    data: {
      threadId: thread.id,
      sender: "CUSTOMER",
      content: cleanContent,
    },
  });

  if (thread.mode === "HUMAN") {
    return { threadId: thread.id, mode: "HUMAN" as const, reply: null };
  }

  if (HANDOFF_REGEX.test(cleanContent)) {
    await db.chatThread.update({
      where: { id: thread.id },
      data: { mode: "HUMAN", lastMessageAt: new Date() },
    });
    const reply =
      "รับทราบครับ ผมส่งเรื่องให้แอดมินคนจริงดูแลต่อให้ทันที รอสักครู่นะครับ";
    await db.chatMessage.create({
      data: { threadId: thread.id, sender: "BOT", content: reply },
    });
    const staffGroup = process.env.LINE_STAFF_GROUP_ID?.trim();
    if (staffGroup) {
      await pushLineMessage(staffGroup, [
        {
          type: "text",
          text: `[Inbox ${params.channel}] ${thread.customerName} ขอคุยกับแอดมิน: "${cleanContent}"`,
        },
      ]);
    }
    return { threadId: thread.id, mode: "HUMAN" as const, reply };
  }

  const reply = await buildRuleReply(cleanContent);
  await db.chatMessage.create({
    data: { threadId: thread.id, sender: "BOT", content: reply },
  });
  return { threadId: thread.id, mode: "BOT" as const, reply };
}

export async function sendAdminChatReply(
  threadId: string,
  content: string,
  adminId: string
) {
  const thread = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("ไม่พบห้องแชทนี้");

  const msg = await db.chatMessage.create({
    data: {
      threadId: thread.id,
      sender: "ADMIN",
      content: content.trim(),
    },
  });

  await db.chatThread.update({
    where: { id: thread.id },
    data: { mode: "HUMAN", assignedAdminId: adminId, lastMessageAt: new Date() },
  });

  if (thread.channel === "LINE") {
    await pushLineMessage(thread.externalId, [{ type: "text", text: content.trim() }]);
  }

  return msg;
}
