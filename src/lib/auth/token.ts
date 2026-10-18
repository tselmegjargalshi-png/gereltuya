import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "gt_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionPayload = { sub: string; role: Role; name: string };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
