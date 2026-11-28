export interface LineQuickReplyItem {
  type: "action";
  action:
    | { type: "message"; label: string; text: string }
    | { type: "uri"; label: string; uri: string };
}

export interface LineQuickReply {
  items: LineQuickReplyItem[];
}

export interface LineFlexBubble {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
  quickReply?: LineQuickReply;
}

export interface LineTextMessage {
  type: "text";
  text: string;
  quickReply?: LineQuickReply;
}

export type LineMessagePayload = LineTextMessage | LineFlexBubble;

export function buildSteakbossQuickReply(baseUrl: string): LineQuickReply {
  const cleanBase = baseUrl.replace(/\/$/, "");
  return {
    items: [
      { type: "action", action: { type: "message", label: "🥩 ดูเมนูสเต๊ก", text: "ดูเมนู" } },
      { type: "action", action: { type: "uri", label: "🛒 สั่งซื้อเลย", uri: `${cleanBase}/liff` } },
      { type: "action", action: { type: "message", label: "🚚 ค่าขนส่ง", text: "ค่าขนส่ง" } },
      { type: "action", action: { type: "message", label: "📦 ติดตามสถานะ", text: "ติดตามสถานะ" } },
      { type: "action", action: { type: "message", label: "🎁 โปรโมชั่น", text: "โปรโมชั่น" } },
      { type: "action", action: { type: "message", label: "💬 คุยแอดมิน", text: "คุยแอดมิน" } },
    ],
  };
}

export function buildOrderFlexMessage(params: {
  orderNo: string;
  statusLabel: string;
  totalBaht: number;
  detailLine: string;
  trackUrl: string;
  confirmDeliveredOrderNo?: string;
}): LineFlexBubble {
  const footerButtons: Array<Record<string, unknown>> = [
    {
      type: "button",
      style: "primary",
      color: "#c99e2e",
      action: {
        type: "uri",
        label: "ติดตามคำสั่งซื้อ",
        uri: params.trackUrl,
      },
    },
  ];

  if (params.confirmDeliveredOrderNo) {
    footerButtons.push({
      type: "button",
      style: "secondary",
      margin: "sm",
      action: {
        type: "postback",
        label: "ยืนยันได้รับสินค้าแล้ว",
        displayText: `ยืนยันได้รับสินค้าแล้ว (${params.confirmDeliveredOrderNo})`,
        data: `action=confirm_delivered&orderNo=${encodeURIComponent(params.confirmDeliveredOrderNo)}`,
      },
    });
  }

  return {
    type: "flex",
    altText: `Steakboss ${params.orderNo}: ${params.statusLabel}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0b0a09",
        contents: [
          { type: "text", text: "STEAKBOSS", color: "#d4af37", weight: "bold", size: "sm" },
          { type: "text", text: params.statusLabel, color: "#f8f3e8", weight: "bold", size: "lg" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: `เลขคำสั่งซื้อ: ${params.orderNo}`, weight: "bold" },
          { type: "text", text: `ยอดรวม: ฿${params.totalBaht.toLocaleString("th-TH")}` },
          { type: "text", text: params.detailLine, wrap: true, size: "sm", color: "#555555" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: footerButtons,
      },
    },
  };
}

export function buildPromptPayOrderFlexMessage(params: {
  orderNo: string;
  totalBaht: number;
  promptpayId: string;
  promptpayName: string;
  qrImageUrl: string;
  payUrl: string;
  trackUrl: string;
}): LineFlexBubble {
  const isHttpsQr = params.qrImageUrl.startsWith("https://");
  return {
    type: "flex",
    altText: `ชำระเงิน ${params.orderNo} ยอด ฿${params.totalBaht.toLocaleString("th-TH")}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0b0a09",
        contents: [
          { type: "text", text: "STEAKBOSS · พร้อมเพย์", color: "#d4af37", weight: "bold", size: "sm" },
          { type: "text", text: `ยอดโอน ฿${params.totalBaht.toLocaleString("th-TH")}`, color: "#f8f3e8", weight: "bold", size: "xl" },
        ],
      },
      ...(isHttpsQr
        ? {
            hero: {
              type: "image",
              url: params.qrImageUrl,
              size: "full",
              aspectRatio: "1:1",
              aspectMode: "fit",
              backgroundColor: "#ffffff",
            },
          }
        : {}),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: `เลขคำสั่งซื้อ: ${params.orderNo}`, weight: "bold", size: "sm" },
          { type: "text", text: `พร้อมเพย์: ${params.promptpayId}`, size: "sm" },
          { type: "text", text: `ชื่อบัญชี: ${params.promptpayName}`, size: "sm", color: "#444444" },
          {
            type: "text",
            text: "โอนเสร็จแล้วส่งรูปสลิปเข้ามาในแชทนี้ได้เลย ระบบจะตรวจสอบและตัดสต็อกให้ทันทีครับ",
            wrap: true,
            size: "xs",
            color: "#15803d",
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#c99e2e",
            action: { type: "uri", label: "ดู QR / แนบสลิปบนเว็บ", uri: params.payUrl },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "uri", label: "ติดตามคำสั่งซื้อ", uri: params.trackUrl },
          },
        ],
      },
    },
  };
}
