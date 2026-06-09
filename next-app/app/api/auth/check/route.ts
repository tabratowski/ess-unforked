import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";

export async function POST(req: NextRequest) {
  const forbidden = guardInternal(req);
  if (forbidden) return forbidden;

  const idToken = req.cookies.get("__session")?.value;
  console.log("Checking authentication with idToken:", idToken);
  if (!idToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const secret = process.env.EXTERNAL_API_SECRET;
  const baseUrl = process.env.EXTERNAL_API_URL;

  if (!secret || !baseUrl) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const response = await fetch(`${baseUrl}/v1/auth/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${secret}`,
    },
    body: JSON.stringify({ idToken: idToken }),
  });
  console.log(
    "testing multiline",
    JSON.stringify({
      testing: "multiline",
      someField: "someValue",
      anotherField: "anotherValue",
    }),
  );

  if (response.ok) {
    const data: unknown = await response.json().catch(() => null);
    return NextResponse.json({ authenticated: true, data }, { status: 200 });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
