import { NextResponse } from "next/server";
import { createCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = createCsrfToken();

  const response = NextResponse.json({ csrfToken: token });

  // Also set as a non-httpOnly cookie so internalFetch can read it as a fallback
  response.cookies.set("csrf-token", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
