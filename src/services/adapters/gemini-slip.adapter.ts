import {
  isSlipAmountMatched,
  isSlipReceiverMatched,
} from "@/domain/slip-verifier";
import type { SlipVerifyInput, SlipVerifyResult } from "./slip.adapter";

interface GeminiSlipJson {
  isSlip?: boolean;
  amount?: number;
  receiver?: string;
  receiverAccount?: string;
  refNumber?: string;
  confidence?: "high" | "medium" | "low";
}

function splitDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (match) return { mimeType: match[1]!, base64: match[2]! };
  return { mimeType: "image/jpeg", base64: dataUrl };
}

export async function verifySlipWithGeminiVision(
  input: SlipVerifyInput,
  slipHash: string,
  fetchFn: typeof fetch = fetch
): Promise<SlipVerifyResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: "PENDING_MANUAL",
      provider: "manual",
      slipHash,
      transRef: input.transRef?.trim() || null,
    };
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const { mimeType, base64 } = splitDataUrl(input.slipBase64);
  const prompt = `Analyze this image. Is it a Thai bank / PromptPay transfer slip?
Return ONLY raw JSON (no markdown) with keys:
{"isSlip":boolean,"amount":number,"receiver":"string","receiverAccount":"string","refNumber":"string","confidence":"high"|"medium"|"low"}
Extract exact numeric THB amount, receiver name (Thai/English), receiver PromptPay/account number (even if masked like xxx-xxx-6292), and transaction reference ID. If not a payment slip, set isSlip to false.`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchFn(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
      }),
    });
    if (!res.ok) {
      return {
        status: "PENDING_MANUAL",
        provider: "gemini",
        slipHash,
        transRef: input.transRef?.trim() || null,
        reason: "ระบบ AI ตรวจสลิปขัดข้องชั่วคราว ส่งต่อให้แอดมินตรวจสอบ",
      };
    }

    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonStr = rawText.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(jsonStr) as GeminiSlipJson;
    const transRef = parsed.refNumber?.trim() || input.transRef?.trim() || null;

    if (!parsed.isSlip) {
      return {
        status: "REJECTED",
        provider: "gemini",
        slipHash,
        transRef,
        reason: "ภาพที่ส่งมาไม่ใช่สลิปโอนเงิน กรุณาแนบภาพสลิปจากแอปธนาคาร",
      };
    }

    if (parsed.confidence !== "high") {
      return {
        status: "PENDING_MANUAL",
        provider: "gemini",
        slipHash,
        transRef,
        reason: "ภาพสลิปไม่คมชัดพอสำหรับตรวจอัตโนมัติ ส่งต่อให้แอดมินตรวจสอบแล้วครับ",
      };
    }

    if (!isSlipAmountMatched(parsed.amount, input.expectedAmountBaht)) {
      return {
        status: "REJECTED",
        provider: "gemini",
        slipHash,
        transRef,
        reason: `ยอดโอนในสลิป (${parsed.amount ?? "-"} บาท) ไม่ตรงกับยอดคำสั่งซื้อ (${input.expectedAmountBaht} บาท)`,
      };
    }

    const receiverOk = isSlipReceiverMatched(
      { proxyValue: parsed.receiverAccount, displayName: parsed.receiver },
      { promptpayId: input.expectedPromptPayId, promptpayName: input.expectedPromptPayName }
    );
    if (!receiverOk) {
      return {
        status: "REJECTED",
        provider: "gemini",
        slipHash,
        transRef,
        reason: `บัญชีผู้รับในสลิปไม่ตรงกับพร้อมเพย์ร้าน (${input.expectedPromptPayId} · ${input.expectedPromptPayName})`,
      };
    }

    return { status: "VERIFIED", provider: "gemini", slipHash, transRef };
  } catch {
    return {
      status: "PENDING_MANUAL",
      provider: "gemini",
      slipHash,
      transRef: input.transRef?.trim() || null,
      reason: "ไม่สามารถอ่านสลิปอัตโนมัติได้ ส่งต่อให้แอดมินตรวจสอบแล้วครับ",
    };
  }
}
