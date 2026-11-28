import crypto from "node:crypto";
import {
  isSlipAmountMatched,
  isSlipReceiverMatched,
  type SlipReceiverObserved,
} from "@/domain/slip-verifier";

export interface SlipVerifyInput {
  slipBase64: string;
  expectedAmountBaht: number;
  expectedPromptPayId: string;
  expectedPromptPayName: string;
  transRef?: string;
}

export interface SlipVerifyResult {
  status: "VERIFIED" | "PENDING_MANUAL" | "REJECTED";
  provider: string;
  slipHash: string;
  transRef: string | null;
  reason?: string;
}

interface ParsedExternalSlip {
  transRef: string | null;
  amount: number | undefined;
  receiver: SlipReceiverObserved;
}

export function computeSlipHash(slipBase64: string): string {
  return crypto.createHash("sha256").update(slipBase64).digest("hex");
}

function decodeBase64ToBlob(dataUrl: string): { blob: Blob; filename: string } {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  const mime = match ? match[1]! : "image/jpeg";
  const rawBase64 = match ? match[2]! : dataUrl;
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(rawBase64, "base64");
  return { blob: new Blob([bytes], { type: mime }), filename: `slip.${ext}` };
}

function extractParsedSlip(payload: Record<string, unknown>): ParsedExternalSlip | null {
  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
  if (!data || typeof data !== "object") return null;

  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "object" && rawAmount !== null && typeof (rawAmount as Record<string, unknown>).amount === "number"
        ? ((rawAmount as Record<string, unknown>).amount as number)
        : undefined;

  const transRef =
    typeof data.transRef === "string" && data.transRef.trim() ? data.transRef.trim() : null;

  const rec = (data.receiver as Record<string, unknown> | undefined) ?? {};
  const recAccount = (rec.account as Record<string, unknown> | undefined) ?? {};
  const proxyObj = (recAccount.proxy as Record<string, unknown> | undefined) ?? (rec.proxy as Record<string, unknown> | undefined) ?? {};
  const bankAccObj = (recAccount.bank as Record<string, unknown> | undefined) ?? {};
  const nameObj = (recAccount.name as Record<string, unknown> | undefined) ?? {};

  const proxyValue =
    typeof proxyObj.account === "string"
      ? proxyObj.account
      : typeof proxyObj.value === "string"
        ? proxyObj.value
        : null;
  const accountValue =
    typeof bankAccObj.account === "string"
      ? bankAccObj.account
      : typeof recAccount.value === "string"
        ? recAccount.value
        : null;
  const displayName =
    typeof rec.displayName === "string"
      ? rec.displayName
      : typeof nameObj.th === "string"
        ? nameObj.th
        : null;
  const name =
    typeof rec.name === "string"
      ? rec.name
      : typeof nameObj.en === "string"
        ? nameObj.en
        : null;

  if (amount === undefined && !transRef) return null;
  return { transRef, amount, receiver: { proxyValue, accountValue, displayName, name } };
}

export async function verifySlipWithAdapter(
  input: SlipVerifyInput
): Promise<SlipVerifyResult> {
  const slipHash = computeSlipHash(input.slipBase64);
  const provider = (process.env.SLIP_VERIFY_PROVIDER || "manual").trim().toLowerCase();
  const apiUrl = process.env.SLIP_VERIFY_API_URL?.trim();
  const apiKey = process.env.SLIP_VERIFY_API_KEY?.trim();

  if (!apiUrl || !apiKey || provider === "manual" || provider === "sandbox") {
    return {
      status: "PENDING_MANUAL",
      provider: "manual",
      slipHash,
      transRef: input.transRef?.trim() || null,
    };
  }

  try {
    const { blob, filename } = decodeBase64ToBlob(input.slipBase64);
    const fd = new FormData();
    const fieldName = provider === "slipok" ? "files" : "file";
    fd.append(fieldName, blob, filename);
    if (provider === "slipok") {
      fd.append("log", "true");
      fd.append("amount", String(input.expectedAmountBaht));
    }

    const headers: Record<string, string> =
      provider === "slipok"
        ? { "x-authorization": apiKey }
        : { Authorization: `Bearer ${apiKey}` };

    const res = await fetch(apiUrl, { method: "POST", headers, body: fd });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const msg = typeof json.message === "string" ? json.message : "";
      if (res.status >= 500 || res.status === 429) {
        return {
          status: "PENDING_MANUAL",
          provider,
          slipHash,
          transRef: input.transRef?.trim() || null,
          reason: "ระบบตรวจสลิปขัดข้องชั่วคราว ส่งต่อให้แอดมินตรวจสอบ",
        };
      }
      return {
        status: "REJECTED",
        provider,
        slipHash,
        transRef: input.transRef?.trim() || null,
        reason: msg || "ไม่พบข้อมูลสลิปที่ถูกต้อง กรุณาตรวจสอบรูปภาพและลองใหม่",
      };
    }

    const parsed = extractParsedSlip(json);
    if (!parsed) {
      return {
        status: "REJECTED",
        provider,
        slipHash,
        transRef: input.transRef?.trim() || null,
        reason: "ไม่สามารถอ่านข้อมูล QR บนสลิปได้ กรุณาแนบสลิปฉบับเต็มจากแอปธนาคาร",
      };
    }

    if (!isSlipAmountMatched(parsed.amount, input.expectedAmountBaht)) {
      return {
        status: "REJECTED",
        provider,
        slipHash,
        transRef: parsed.transRef ?? input.transRef?.trim() ?? null,
        reason: `ยอดโอนในสลิป (${parsed.amount ?? "-"} บาท) ไม่ตรงกับยอดคำสั่งซื้อ (${input.expectedAmountBaht} บาท)`,
      };
    }

    const receiverOk = isSlipReceiverMatched(parsed.receiver, {
      promptpayId: input.expectedPromptPayId,
      promptpayName: input.expectedPromptPayName,
    });
    if (!receiverOk) {
      return {
        status: "REJECTED",
        provider,
        slipHash,
        transRef: parsed.transRef ?? input.transRef?.trim() ?? null,
        reason: `บัญชีผู้รับในสลิปไม่ตรงกับพร้อมเพย์ร้าน (${input.expectedPromptPayId} · ${input.expectedPromptPayName})`,
      };
    }

    return {
      status: "VERIFIED",
      provider,
      slipHash,
      transRef: parsed.transRef ?? input.transRef?.trim() ?? null,
    };
  } catch {
    return {
      status: "PENDING_MANUAL",
      provider,
      slipHash,
      transRef: input.transRef?.trim() || null,
      reason: "เชื่อมต่อระบบตรวจสลิปไม่สำเร็จ ส่งต่อให้แอดมินตรวจสอบ",
    };
  }
}
