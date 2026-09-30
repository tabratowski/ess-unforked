import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) throw new Error("CSRF_SECRET env variable is not set");
  return secret;
}

/** Creates a signed CSRF token: `timestamp.hmac` */
export function createCsrfToken(): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac("sha256", getSecret())
    .update(timestamp)
    .digest("hex");
  return `${timestamp}.${hmac}`;
}

/** Returns true if the token is valid and not expired. */
export function verifyCsrfToken(token: string | null | undefined): boolean {
  if (!token) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const timestamp = token.slice(0, dotIndex);
  const receivedHmac = token.slice(dotIndex + 1);

  // Check expiry
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) return false;

  // Constant-time HMAC comparison
  const expectedHmac = createHmac("sha256", getSecret())
    .update(timestamp)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(receivedHmac, "hex"),
      Buffer.from(expectedHmac, "hex"),
    );
  } catch {
    return false;
  }
}
