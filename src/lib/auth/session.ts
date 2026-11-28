import crypto from "node:crypto";
import { cookies } from "next/headers";

export type UserRole = "CUSTOMER" | "WHOLESALE" | "OWNER" | "ADMIN" | "PACKER";

export interface SessionPayload {
  userId: string;
  role: UserRole;
  name: string;
  exp: number;
}

const COOKIE_NAME = "sb_session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

let warnedWeakSecret = false;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim() || "";
  const isWeak =
    secret.length < 32 ||
    secret.includes("change-this") ||
    secret.includes("dev-session-secret");

  if (process.env.NODE_ENV === "production" && isWeak && !warnedWeakSecret) {
    warnedWeakSecret = true;
    console.error(
      "[SECURITY CRITICAL] SESSION_SECRET is missing or using a default placeholder. Set a random 64-char SESSION_SECRET in Coolify immediately!"
    );
  }
  return secret || "steakboss-dev-session-secret-fallback";
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
}

export function createSessionToken(
  user: Omit<SessionPayload, "exp">,
  nowMs: number = Date.now()
): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(nowMs / 1000) + TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(
  token: string | undefined,
  nowMs: number = Date.now()
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!parsed.userId || !parsed.role || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < Math.floor(nowMs / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(user: Omit<SessionPayload, "exp">): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
