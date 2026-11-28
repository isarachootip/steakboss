import { db } from "@/lib/db";
import { listCatalogProducts } from "./product.service";
import { getStoreSettings } from "./settings.service";
import { listPublishedGuides } from "./content.service";
import { lookupOrderForTracking } from "./order.service";
import { resolveShippingZone, ZONE_LABELS } from "@/domain/shipping";
import { buildCatalogChatReply } from "@/domain/chatbot-catalog-reply";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";
import { formatBaht } from "@/lib/format";
import { formatGuideChatReply, matchGuideForChatQuery } from "@/domain/content-defaults";
import { generateBossBotAiReply } from "./adapters/llm.adapter";
import { pushLineMessage, type LineMessagePayload } from "./adapters/line.adapter";
import { buildLineMenuFlexIfMatched } from "./chatbot-line-menu";

const HANDOFF_REGEX = /แอดมิน|พนักงาน|เจ้าหน้าที่|คุยกับคน|เคลม|สินค้าเสียหาย|ร้องเรียน/;

interface BotReplyOutput {
  text: string;
  flexMessages?: LineMessagePayload[];
}

async function buildRuleReply(params: {
  text: string;
  channel: "WEB" | "LINE";
  userId?: string;
}): Promise<BotReplyOutput> {
  const { text, channel, userId } = params;
  const s = text.toLowerCase();

  const lineFlex = await buildLineMenuFlexIfMatched(text, channel);
  if (lineFlex) return lineFlex;

  const orderMatch = text.toUpperCase().match(/SB\d{6}-[A-Z0-9]{4}/);
  const phone4 = text.replace(/SB\d{6}-[A-Z0-9]{4}/i, "").match(/\d{4}(?!.*\d)/)?.[0];
  if (orderMatch) {
    const orderNo = orderMatch[0];
    if (!phone4) return { text: `ขอเบอร์โทร 4 ตัวท้ายที่ใช้สั่ง ${orderNo} ด้วยครับ เช่น "${orderNo} 1234"` };
    const looked = await lookupOrderForTracking(orderNo, phone4);
    if (!looked.ok) return { text: looked.error };
    const o = looked.order;
    const trackLine = o.trackingNo ? `\nขนส่ง: ${o.carrier || "รถเย็น"} เลขพัสดุ ${o.trackingNo}` : "";
    return { text: `ออเดอร์ ${o.orderNo}\nสถานะ: ${o.statusLabel}${trackLine}\nยอดรวม ${formatBaht(o.totalBaht)}` };
  }

  if (/ติดตาม|สถานะ|พัสดุ|ถึงไหน|track|เช็กออเดอร์/.test(s)) {
    if (userId) {
      const latest = await db.order.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { orderNo: true, status: true, totalBaht: true, carrier: true, trackingNo: true },
      });
      if (latest) {
        const label = isOrderStatus(latest.status) ? ORDER_STATUS_LABELS[latest.status] : latest.status;
        const trackLine = latest.trackingNo ? `\nขนส่ง: ${latest.carrier || "รถเย็น"} เลขพัสดุ ${latest.trackingNo}` : "";
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://steakboss.odmfood.online").replace(/\/$/, "");
        return {
          text: `ออเดอร์ล่าสุดของคุณ ${latest.orderNo}\nสถานะ: ${label}${trackLine}\nยอดรวม ${formatBaht(latest.totalBaht)}\nดูรายละเอียด: ${baseUrl}/track?orderNo=${latest.orderNo}`,
        };
      }
    }
    return { text: 'พิมพ์เลขคำสั่งซื้อและเบอร์ 4 ตัวท้ายได้เลยครับ เช่น "SB261128-AB12 1234"' };
  }

  const settings = await getStoreSettings();
  const postcode = text.match(/\b\d{5}\b/)?.[0];
  if (/ส่ง|ค่าขนส่ง|shipping|ไปรษณีย์/.test(s) && !/ติดตาม|สถานะ|พัสดุ|ราคาส่ง|ขายส่ง/.test(s)) {
    if (postcode) {
      const z = resolveShippingZone(postcode);
      if (z) {
        const fee = z === "BKK" ? settings.bkkShipBaht : settings.upcShipBaht;
        return { text: `รหัส ${postcode} อยู่โซน${ZONE_LABELS[z]} ค่าส่งรถเย็น ฿${fee} (ส่งฟรีเมื่อซื้อครบ ${formatBaht(settings.freeShipThreshold)})` };
      }
    }
    return { text: `ค่าส่งรถเย็น: กทม.และปริมณฑล ฿${settings.bkkShipBaht} · ต่างจังหวัด ฿${settings.upcShipBaht}\nซื้อครบ ${formatBaht(settings.freeShipThreshold)} ส่งฟรี · รับเองที่โรงงานอ่างทองฟรีครับ` };
  }

  const guides = await listPublishedGuides();
  const matchedGuide = matchGuideForChatQuery(text, guides);
  if (matchedGuide) return { text: formatGuideChatReply(matchedGuide, process.env.NEXT_PUBLIC_APP_URL) };

  if (/ปรุง|ย่าง|ทอด|ทำยังไง|ละลาย|หม้อทอด|ไมโครเวฟ|เวฟ/.test(s)) {
    return { text: "ละลายในช่องเย็นข้ามคืน (หรือแช่ทั้งซองในน้ำเย็น 30–40 นาที)\nกระทะไฟกลางค่อนแรง ข้างละ 4–6 นาที หรือหม้อทอดไร้น้ำมัน 180°C 12–15 นาที\nสุกทั่ว ไก่ 74°C หมู 70°C พัก 3 นาทีแล้วเสิร์ฟครับ" };
  }
  if (/เก็บ|แช่แข็ง|ฟรีซ/.test(s)) {
    return { text: "เก็บในช่องแช่แข็ง -18°C ครับ ละลายแล้วไม่ควรนำกลับไปแช่แข็งซ้ำ" };
  }
  if (/จ่าย|โอน|พร้อมเพย์|ปลายทาง|cod/.test(s)) {
    return { text: `ชำระได้ 2 แบบ: โอนพร้อมเพย์ ${settings.promptpayId} (${settings.promptpayName}) พร้อมส่งสลิปในแชทนี้ได้เลย หรือเก็บเงินปลายทาง (+฿${settings.codFeeBaht}) ครับ` };
  }

  const products = await listCatalogProducts();
  const catalogReply = buildCatalogChatReply(s, products, settings.wholesaleMinPacks);
  if (catalogReply) return { text: catalogReply };

  const topSamples = products.slice(0, 12).map((p) => `${p.name} ปลีก฿${p.priceBaht}/ส่ง฿${p.wholesalePriceBaht}`).join(", ");
  const sysPrompt = `คุณคือ "บอสบอท" ผู้ช่วยร้าน Steakboss (สเต๊กหมักแช่แข็ง -18°C จ.อ่างทอง) ตอบภาษาไทยสุภาพ ลงท้ายครับ สั้นไม่เกิน 5 บรรทัด
สั่งคละครบ ${settings.wholesaleMinPacks} แพ็คได้ราคาส่งอัตโนมัติ ตัวอย่างสินค้า: ${topSamples}
ค่าส่งรถเย็น: กทม. ฿${settings.bkkShipBaht}, ตจว. ฿${settings.upcShipBaht}, ส่งฟรีเมื่อครบ ฿${settings.freeShipThreshold}`;
  const aiText = await generateBossBotAiReply(sysPrompt, text);
  if (aiText) return { text: aiText };

  return { text: 'ผมช่วยเรื่องเมนู ราคาปลีก-ส่ง ค่าขนส่ง ติดตามพัสดุ และวิธีปรุงได้ครับ พิมพ์ "ดูเมนู" เพื่อเลือกสั่งซื้อ หรือพิมพ์ "คุยแอดมิน" เพื่อติดต่อทีมงานได้เลยครับ' };
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
    where: { channel_externalId: { channel: params.channel, externalId: params.externalId } },
    update: {
      lastMessageAt: new Date(),
      ...(params.customerName ? { customerName: params.customerName } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    },
    create: {
      channel: params.channel,
      externalId: params.externalId,
      customerName: params.customerName || (params.channel === "LINE" ? "ลูกค้า LINE OA" : "ลูกค้าหน้าร้าน"),
      userId: params.userId ?? null,
      mode: "BOT",
    },
  });

  await db.chatMessage.create({ data: { threadId: thread.id, sender: "CUSTOMER", content: cleanContent } });
  if (thread.mode === "HUMAN") return { threadId: thread.id, mode: "HUMAN" as const, reply: null };

  if (HANDOFF_REGEX.test(cleanContent)) {
    await db.chatThread.update({ where: { id: thread.id }, data: { mode: "HUMAN", lastMessageAt: new Date() } });
    const reply = "รับทราบครับ ผมส่งเรื่องให้แอดมินคนจริงดูแลต่อให้ทันที รอสักครู่นะครับ";
    await db.chatMessage.create({ data: { threadId: thread.id, sender: "BOT", content: reply } });
    const staffGroup = process.env.LINE_STAFF_GROUP_ID?.trim();
    if (staffGroup) {
      await pushLineMessage(staffGroup, [
        { type: "text", text: `[Inbox ${params.channel}] ${thread.customerName} ขอคุยกับแอดมิน: "${cleanContent}"` },
      ]);
    }
    return { threadId: thread.id, mode: "HUMAN" as const, reply };
  }

  const output = await buildRuleReply({
    text: cleanContent,
    channel: params.channel,
    userId: params.userId ?? thread.userId ?? undefined,
  });
  await db.chatMessage.create({ data: { threadId: thread.id, sender: "BOT", content: output.text } });
  return { threadId: thread.id, mode: "BOT" as const, reply: output.text, flexMessages: output.flexMessages };
}

export async function sendAdminChatReply(threadId: string, content: string, adminId: string) {
  const thread = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("ไม่พบห้องแชทนี้");

  const msg = await db.chatMessage.create({
    data: { threadId: thread.id, sender: "ADMIN", content: content.trim() },
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
