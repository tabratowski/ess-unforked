import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const forbidden = guardInternal(req);
  if (forbidden) return forbidden;

  const baseUrl = process.env.IDENTITY_SERVICE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "IDENTITY_SERVICE_URL is not configured" },
      { status: 500 },
    );
  }

  const { path } = await params;
  const upstream = `${baseUrl.replace(/\/+$/, "")}/${path.join("/")}${req.nextUrl.search}`;
  console.log(`Proxying request to: ${upstream}`);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const name of ["x-license-key", "x-tenant-id", "authorization"]) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }
  console.log(`Proxying request headers: ${JSON.stringify(headers)}`);
  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "DELETE") {
    body = await req.text();
  }

  const response = await fetch(upstream, {
    method: req.method,
    headers,
    body,
  });

  const data: unknown = await response.json().catch(() => null);
  const res = NextResponse.json(data, { status: response.status });

  const joinedPath = path.join("/");
  const isAuthEndpoint =
    joinedPath.endsWith("subscribers:authenticate") ||
    joinedPath.endsWith("subscribers:signUp") ||
    joinedPath.endsWith("subscribers:socialSignIn") ||
    joinedPath.endsWith("tokens:refresh");

  if (response.ok && isAuthEndpoint && data && typeof data === "object") {
    const idToken = (data as Record<string, unknown>).idToken;
    if (typeof idToken === "string") {
      res.cookies.set("__session", idToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        domain: ".wpenginepoweredstaging.com",
        maxAge: 60 * 60,
      });
    }
  }

  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const PUT = proxy;
