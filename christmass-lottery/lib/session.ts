import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Session = { id: number; login: string; email: string };

const COOKIE = "cl_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ id: s.id, login: s.login, email: s.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const { id, login, email } = payload as Record<string, unknown>;
    if (typeof id !== "number" || typeof login !== "string" || typeof email !== "string") return null;
    return { id, login, email };
  } catch {
    return null;
  }
}

export async function createSession(s: Session): Promise<void> {
  (await cookies()).set(COOKIE, await signSession(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
