import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";

export async function POST(req: NextRequest) {
  const forbidden = guardInternal(req);
  if (forbidden) return forbidden;

  const secret = process.env.EXTERNAL_API_SECRET;
  const baseUrl = process.env.EXTERNAL_API_URL;

  if (!secret || !baseUrl) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const response = await fetch(`${baseUrl}/v1/auth/store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${secret}`,
    },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  console.log("body received in /api/auth/store-token:", body);
  // Extract idToken from the request body to set as _session cookie
  const idToken =
    (body as { token?: { idToken?: string } })?.token?.idToken ?? null;

  const res = NextResponse.json(data, { status: response.status });

  if (idToken) {
    res.cookies.set("__session", idToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      domain: ".wpenginepoweredstaging.com",
      maxAge: 60 * 60,
    });
  }
  console.log("Set __session cookie with idToken:", idToken);
  return res;
}
