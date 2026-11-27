export interface LineFlexBubble {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}

export interface LineTextMessage {
  type: "text";
  text: string;
}

export type LineMessagePayload = LineTextMessage | LineFlexBubble;

export function buildOrderFlexMessage(params: {
  orderNo: string;
  statusLabel: string;
  totalBaht: number;
  detailLine: string;
  trackUrl: string;
}): LineFlexBubble {
  return {
    type: "flex",
    altText: `Steakboss ${params.orderNo}: ${params.statusLabel}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#151211",
        contents: [
          {
            type: "text",
            text: "STEAKBOSS",
            color: "#ff6fb7",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: params.statusLabel,
            color: "#f7f0ea",
            weight: "bold",
            size: "lg",
          },
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
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#ff6fb7",
            action: {
              type: "uri",
              label: "ติดตามคำสั่งซื้อ",
              uri: params.trackUrl,
            },
          },
        ],
      },
    },
  };
}
