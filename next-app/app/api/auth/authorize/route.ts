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

  const response = await fetch(`${baseUrl}/v1/auth/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${secret}`,
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json().catch(() => null);

  return NextResponse.json(data, { status: response.status });
}
