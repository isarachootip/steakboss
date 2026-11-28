import type { LineProfile } from "./line-login.service";

export async function verifyLineLiffIdToken(
  idToken: string,
  fetchFn: typeof fetch = fetch
): Promise<LineProfile> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  if (!channelId) {
    throw new Error("ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID");
  }
  const res = await fetchFn("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    sub?: string;
    name?: string;
    picture?: string;
    error_description?: string;
  };
  if (!res.ok || !json.sub) {
    throw new Error(json.error_description || "ไม่สามารถยืนยันตัวตน LIFF ID Token ได้");
  }
  return {
    userId: json.sub,
    displayName: json.name?.trim() || "ลูกค้า LINE",
    pictureUrl: json.picture,
  };
}
