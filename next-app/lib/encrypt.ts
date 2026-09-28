import { webcrypto } from "node:crypto";

const AES_256_KEY_BYTES = 32;
const KID_BYTE_LENGTH = 36;

function decodeEncryptionKey(keyValue: string): Uint8Array {
  const trimmed = keyValue.trim();
  const parseHex = (value: string): Uint8Array => {
    const bytes = new Uint8Array(value.length / 2);
    for (let index = 0; index < value.length; index += 2) {
      bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
    }
    return bytes;
  };

  // Support URL-safe base64 values commonly used in env vars.
  const fromBase64 = base64UrlDecode(trimmed);
  if (fromBase64.length === AES_256_KEY_BYTES) {
    return fromBase64;
  }

  // Accept keys that are base64-encoded 64-char hex strings.
  const decodedText = new TextDecoder().decode(fromBase64).trim();
  if (/^[0-9a-fA-F]{64}$/.test(decodedText)) {
    return parseHex(decodedText);
  }

  // Also accept a 64-char hex string for local testing convenience.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return parseHex(trimmed);
  }

  throw new Error(
    `PAYWALL_ENCRYPTION_KEY has invalid length. Expected ${AES_256_KEY_BYTES} bytes (AES-256) after decoding base64/base64url, base64(hex), or 64 hex chars, got ${fromBase64.length}.`,
  );
}

export const encrypt = async (
  keyBase64: string,
  hostname: string,
): Promise<string> => {
  if (!keyBase64 || !hostname) {
    console.warn("Missing required parameters for encryption");
    return "";
  }

  const rawKey = decodeEncryptionKey(keyBase64);

  const cryptoKey = await webcrypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ hostname }));
  const ciphertext = new Uint8Array(
    await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      plaintext,
    ),
  );

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);

  const value = Buffer.from(combined)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return value;
};

type PrivateJwk = JsonWebKey & { kid?: string };

function parsePrivateJwks(value: string): PrivateJwk[] {
  try {
    const parsed = JSON.parse(value) as { keys?: PrivateJwk[] } | PrivateJwk;
    if (Array.isArray((parsed as { keys?: PrivateJwk[] }).keys)) {
      return (parsed as { keys: PrivateJwk[] }).keys;
    }
    return [parsed as PrivateJwk];
  } catch {
    try {
      const decoded = new TextDecoder().decode(base64UrlDecode(value));
      return parsePrivateJwks(decoded);
    } catch {
      throw new Error(
        "Private JWKS env value must be JSON or base64-encoded JSON",
      );
    }
  }
}

function getPrivateJwksFromEnv(): PrivateJwk[] {
  const value =
    process.env.PAYWALL_PRIVATE_JWKS ?? process.env.PAYWALL_PRIVATE_JWK;
  if (!value) {
    throw new Error(
      "Missing PAYWALL_PRIVATE_JWKS or PAYWALL_PRIVATE_JWK environment variable",
    );
  }

  const keys = parsePrivateJwks(value);
  if (keys.length === 0) throw new Error("Private JWKS contains no keys");
  return keys;
}

export async function decryptCookie(cookieValue: string) {
  const raw = base64UrlDecode(decodeURIComponent(cookieValue));
  const privateJwks = getPrivateJwksFromEnv();
  try {
    for (const jwk of privateJwks) {
      if (!jwk.n) continue;
      console.log(`Processing JWK with kid: ${jwk.kid ?? "undefined"}`);
      const wrappedKeyLength = base64UrlDecode(jwk.n).length;
      const kidStart = wrappedKeyLength + 12;
      const kidEnd = kidStart + KID_BYTE_LENGTH;
      console.log(`Calculated kidStart: ${kidStart}, kidEnd: ${kidEnd}`);
      if (raw.length < kidEnd + 16) { console.log(`Raw length is too short: ${raw.length}, required: ${kidEnd + 16}`); continue; }
      console.log(`Raw length: ${raw.length}, required length: ${kidEnd + 16}`);

      const kid = new TextDecoder().decode(raw.subarray(kidStart, kidEnd));
      console.log(`Found kid: ${kid}`);
      if (jwk.kid && jwk.kid !== kid) {
        console.log(`JWK kid does not match: ${jwk.kid} !== ${kid}`);
        continue;
      }

      const privateKey = await webcrypto.subtle.importKey(
        "jwk",
        { ...jwk, key_ops: ["unwrapKey"], ext: true },
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["unwrapKey"],
      );
      console.log(`Imported private key for JWK with kid: ${jwk.kid ?? "undefined"}`);
      const wrappedKey = raw.subarray(0, wrappedKeyLength);
      console.log(`Wrapped key subarray length: ${wrappedKey.length}`);
      const aesKey = await webcrypto.subtle.unwrapKey(
        "raw",
        wrappedKey,
        privateKey,
        { name: "RSA-OAEP" },
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
      );
      console.log(`Wrapped key length: ${wrappedKey.length}`);
      const iv = raw.subarray(wrappedKeyLength, wrappedKeyLength + 12);
      console.log(`IV length: ${iv.length}`);
      const ciphertextWithTag = raw.subarray(kidEnd);
      console.log(`Ciphertext with tag length: ${ciphertextWithTag.length}`);
      const plaintextBuf = await webcrypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        ciphertextWithTag,
      );
      console.log(`Plaintext buffer length: ${plaintextBuf.byteLength}`);
      return JSON.parse(new TextDecoder().decode(plaintextBuf));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`Decryption error: ${err}`);
    throw new Error(`Decryption failed: ${message}`);
  }
  throw new Error("No matching private key found for encrypted payload");
}
const keyVersion = 1;
function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
let rsaKeyPair = (await crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["wrapKey", "unwrapKey"],
)) as CryptoKeyPair;

const privateJwk = await crypto.subtle.exportKey("jwk", rsaKeyPair.privateKey);
let jwksString = JSON.stringify({
  keys: [{ ...privateJwk, kid: String(keyVersion) }],
});
export { jwksString };

export async function encryptCookie(
  data: any,
  version: number = keyVersion,
): Promise<string> {
  const aesKey = (await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  )) as CryptoKey;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext),
  );

  const encryptedKey = new Uint8Array(
    await crypto.subtle.wrapKey(
      "raw",
      aesKey as CryptoKey,
      rsaKeyPair.publicKey,
      { name: "RSA-OAEP" },
    ),
  );

  const versionBytes = new Uint8Array(2);
  versionBytes[0] = (version >> 8) & 0xff;
  versionBytes[1] = version & 0xff;

  const combined = new Uint8Array(
    encryptedKey.length + iv.length + versionBytes.length + ciphertext.length,
  );
  let offset = 0;
  combined.set(encryptedKey, offset);
  offset += encryptedKey.length;
  combined.set(iv, offset);
  offset += iv.length;
  combined.set(versionBytes, offset);
  offset += versionBytes.length;
  combined.set(ciphertext, offset);

  return encodeURIComponent(btoa(String.fromCharCode(...combined)));
}

const PUBLIC_JWKS_URL =
  process.env.PAYWALL_PUBLIC_JWKS_URL ??
  "https://storage.googleapis.com/wpe-newsroom-stg-paywall-keys/newsroom-public-key.json";

type PublicJwk = JsonWebKey & { kid?: string };

async function fetchPublicJwks(): Promise<PublicJwk[]> {
  const requestUrl = new URL(PUBLIC_JWKS_URL);
  requestUrl.searchParams.set("_refresh", `${Date.now()}-${Math.random()}`);

  const response = await fetch(requestUrl, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache, no-store, max-age=0",
      pragma: "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch public JWKS (${response.status} ${response.statusText})`,
    );
  }

  const body = (await response.json()) as { keys?: PublicJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Public JWKS response contains no keys");
  }

  return body.keys;
}

/** Returns the first key from the remote JWKS, imported for RSA-OAEP key wrapping. */
export async function getPublicWrappingKey(): Promise<{
  key: CryptoKey;
  kid: string;
}> {
  const [jwk] = await fetchPublicJwks();
  const key = await webcrypto.subtle.importKey(
    "jwk",
    { ...jwk, key_ops: ["wrapKey"], ext: true },
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey"],
  );
  console.log(`Imported public wrapping key with kid: ${jwk.kid ?? ""}`);
  return { key, kid: jwk.kid ?? "" };
}

/**
 * Hybrid-encrypts `data` with the first public key of the remote JWKS.
 * Payload layout: RSA-wrapped AES key | 12-byte IV | 36-byte UUID kid | AES-GCM ciphertext.
 */
export async function encryptWithPublicKey(
  data: unknown,
): Promise<{ value: string; kid: string }> {
  const { key: wrappingKey, kid } = await getPublicWrappingKey();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(kid)) {
    throw new Error(`Public JWKS kid must be a UUID, got ${kid || "empty value"}`);
  }

  const aesKey = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );

  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext),
  );

  const encryptedKey = new Uint8Array(
    await webcrypto.subtle.wrapKey("raw", aesKey, wrappingKey, {
      name: "RSA-OAEP",
    }),
  );

  const kidBytes = new TextEncoder().encode(kid);
  if (kidBytes.length !== KID_BYTE_LENGTH) {
    throw new Error(`Public JWKS kid must be ${KID_BYTE_LENGTH} bytes`);
  }

  const combined = new Uint8Array(
    encryptedKey.length + iv.length + kidBytes.length + ciphertext.length,
  );
  let offset = 0;
  combined.set(encryptedKey, offset);
  offset += encryptedKey.length;
  combined.set(iv, offset);
  offset += iv.length;
  combined.set(kidBytes, offset);
  offset += kidBytes.length;
  combined.set(ciphertext, offset);

  return {
    value: encodeURIComponent(Buffer.from(combined).toString("base64")),
    kid,
  };
}
