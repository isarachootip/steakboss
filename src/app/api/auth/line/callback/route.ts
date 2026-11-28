import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSessionCookie, type UserRole } from "@/lib/auth/session";
import {
  exchangeLineCodeForProfile,
  resolveLineRedirectUri,
  sanitizeNextPath,
  upsertCustomerFromLineProfile,
} from "@/services/line-login.service";

const OAUTH_COOKIE = "sb_line_oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errParam = searchParams.get("error");

  const jar = await cookies();
  const rawCookie = jar.get(OAUTH_COOKIE)?.value;
  jar.delete(OAUTH_COOKIE);

  let expectedState = "";
  let nextPath = "/account";
  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie) as { state?: string; next?: string };
      expectedState = parsed.state ?? "";
      nextPath = sanitizeNextPath(parsed.next);
    } catch {
      // invalid cookie payload
    }
  }

  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin;

  if (errParam || !code || !state || !expectedState || state !== expectedState) {
    const failUrl = new URL(nextPath, baseAppUrl);
    failUrl.searchParams.set("lineError", errParam || "invalid_state");
    return NextResponse.redirect(failUrl);
  }

  try {
    const redirectUri = resolveLineRedirectUri(req.url);
    const profile = await exchangeLineCodeForProfile({ code, redirectUri });
    const user = await upsertCustomerFromLineProfile(profile);

    await setSessionCookie({
      userId: user.id,
      role: user.role as UserRole,
      name: user.name,
    });

    return NextResponse.redirect(new URL(nextPath, baseAppUrl));
  } catch (err) {
    console.error("LINE Login callback error:", err);
    const failUrl = new URL(nextPath, baseAppUrl);
    failUrl.searchParams.set("lineError", "callback_failed");
    return NextResponse.redirect(failUrl);
  }
}
