import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildLineAuthorizeUrl,
  isLineLoginConfigured,
  resolveLineRedirectUri,
  sanitizeNextPath,
} from "@/services/line-login.service";

const OAUTH_COOKIE = "sb_line_oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  if (!isLineLoginConfigured()) {
    const fallbackUrl = new URL(nextPath, req.url);
    fallbackUrl.searchParams.set("lineError", "not_configured");
    return NextResponse.redirect(fallbackUrl);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = resolveLineRedirectUri(req.url);
  const authorizeUrl = buildLineAuthorizeUrl({ state, redirectUri });

  const jar = await cookies();
  jar.set(OAUTH_COOKIE, JSON.stringify({ state, next: nextPath }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeUrl);
}
