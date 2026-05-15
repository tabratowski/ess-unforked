import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";
import type { SessionUser } from "@/lib/types";

export type { SessionUser } from "@/lib/types";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const forbidden = guardInternal(req);
  if (forbidden) return forbidden;

  const idToken = req.cookies.get("_session")?.value;
  if (!idToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const payload = decodeJwtPayload(idToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const user: SessionUser = {
    uid: payload["sub"] as string,
    email: (payload["email"] as string) ?? null,
    emailVerified: (payload["email_verified"] as boolean) ?? false,
    name: (payload["name"] as string) ?? null,
    picture: (payload["picture"] as string) ?? null,
  };

  return NextResponse.json(user);
}
