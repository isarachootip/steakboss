function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatPromptPayAccount(rawTarget: string): { tag: string; value: string } {
  const digits = rawTarget.replace(/\D/g, "");
  if (digits.length === 13) {
    return { tag: "02", value: digits };
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return { tag: "01", value: `0066${digits.slice(1)}` };
  }
  if (digits.length === 11 && digits.startsWith("66")) {
    return { tag: "01", value: `00${digits}` };
  }
  throw new Error("รูปแบบเบอร์พร้อมเพย์หรือเลขประจำตัวผู้เสียภาษีไม่ถูกต้อง");
}

export function buildPromptPayPayload(
  promptpayId: string,
  amountBaht?: number
): string {
  const account = formatPromptPayAccount(promptpayId);
  const merchantInfo =
    tlv("00", "A000000677010111") + tlv(account.tag, account.value);

  const parts = [
    tlv("00", "01"),
    tlv("01", amountBaht && amountBaht > 0 ? "12" : "11"),
    tlv("29", merchantInfo),
    tlv("53", "764"),
    tlv("58", "TH"),
  ];

  if (amountBaht && amountBaht > 0) {
    parts.splice(4, 0, tlv("54", amountBaht.toFixed(2)));
  }

  const body = parts.join("") + "6304";
  return body + crc16Ccitt(body);
}
