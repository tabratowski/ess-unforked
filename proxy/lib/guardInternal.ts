import { NextRequest, NextResponse } from "next/server";
import { verifyCsrfToken } from "@/lib/csrf";

const INTERNAL_HEADER = "x-internal-request";
const INTERNAL_VALUE = "1";
const CSRF_HEADER = "x-csrf-token";

/**
 * Returns a 403 response if the request did not originate from this app.
 * Checks:
 * 1. Custom internal header
 * 2. Origin header against NEXT_PUBLIC_APP_URL
 * 3. CSRF token signature and expiry
 *
 * Returns null when the request is allowed.
 */
export function guardInternal(req: NextRequest): NextResponse | null {
  // 1. Custom header check
  if (req.headers.get(INTERNAL_HEADER) !== INTERNAL_VALUE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Origin check (present on cross-origin requests and same-origin fetch)
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl && origin && origin !== appUrl) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. CSRF token check
  const csrfToken = req.headers.get(CSRF_HEADER);
  if (!verifyCsrfToken(csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null;
}
