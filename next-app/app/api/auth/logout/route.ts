import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";

export async function POST(req: NextRequest) {
  const forbidden = guardInternal(req);
  if (forbidden) return forbidden;

  const res = NextResponse.json({ success: true });
  res.cookies.set("__session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    domain: ".wpenginepoweredstaging.com",
  });
  return res;
}
