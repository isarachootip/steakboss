import crypto from "node:crypto";

export interface SlipVerifyInput {
  slipBase64: string;
  expectedAmountBaht: number;
  transRef?: string;
  autoVerifyDemo?: boolean;
}

export interface SlipVerifyResult {
  status: "VERIFIED" | "PENDING_MANUAL" | "REJECTED";
  provider: string;
  slipHash: string;
  transRef: string | null;
  reason?: string;
}

export function computeSlipHash(slipBase64: string): string {
  return crypto.createHash("sha256").update(slipBase64).digest("hex");
}

export async function verifySlipWithAdapter(
  input: SlipVerifyInput
): Promise<SlipVerifyResult> {
  const slipHash = computeSlipHash(input.slipBase64);
  const apiUrl = process.env.SLIP_VERIFY_API_URL?.trim();
  const apiKey = process.env.SLIP_VERIFY_API_KEY?.trim();

  if (apiUrl && apiKey) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-authorization": apiKey,
        },
        body: JSON.stringify({
          data: input.slipBase64,
          amount: input.expectedAmountBaht,
        }),
      });
      if (!res.ok) {
        return {
          status: "PENDING_MANUAL",
          provider: process.env.SLIP_VERIFY_PROVIDER || "external",
          slipHash,
          transRef: input.transRef || null,
          reason: "ไม่สามารถเชื่อมต่อระบบตรวจสลิปอัตโนมัติได้ ส่งต่อให้แอดมินตรวจ",
        };
      }
      const json = (await res.json()) as {
        success?: boolean;
        data?: { transRef?: string; amount?: number };
        message?: string;
      };
      if (json.success && json.data) {
        const amountMatches =
          typeof json.data.amount !== "number" ||
          Math.abs(json.data.amount - input.expectedAmountBaht) < 1;
        return {
          status: amountMatches ? "VERIFIED" : "REJECTED",
          provider: process.env.SLIP_VERIFY_PROVIDER || "external",
          slipHash,
          transRef: json.data.transRef ?? input.transRef ?? null,
          reason: amountMatches ? undefined : "ยอดโอนในสลิปไม่ตรงกับยอดคำสั่งซื้อ",
        };
      }
      return {
        status: "REJECTED",
        provider: process.env.SLIP_VERIFY_PROVIDER || "external",
        slipHash,
        transRef: input.transRef || null,
        reason: json.message || "ไม่สามารถยืนยันสลิปได้",
      };
    } catch {
      return {
        status: "PENDING_MANUAL",
        provider: process.env.SLIP_VERIFY_PROVIDER || "external",
        slipHash,
        transRef: input.transRef || null,
        reason: "ระบบตรวจสลิปขัดข้องชั่วคราว ส่งให้แอดมินตรวจสอบ",
      };
    }
  }

  // Sandbox mode: supports instant demo verification or manual admin review
  const ref = input.transRef?.trim() || `SB-SLIP-${slipHash.slice(0, 12).toUpperCase()}`;
  return {
    status: input.autoVerifyDemo ? "VERIFIED" : "PENDING_MANUAL",
    provider: "sandbox",
    slipHash,
    transRef: ref,
  };
}
