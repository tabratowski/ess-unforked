import { NextRequest, NextResponse } from "next/server";
import { guardInternal } from "@/lib/guardInternal";

export async function POST(req: NextRequest) {
  const forbidden = guardInternal(req);
  if (forbidden) return forbidden;

  const res = NextResponse.json({ success: true });
  res.cookies.set("__session", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}
