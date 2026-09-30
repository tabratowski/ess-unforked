import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const name of ["x-license-key", "x-tenant-id", "authorization"]) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

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
  return NextResponse.json(data, { status: response.status });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const PUT = proxy;
