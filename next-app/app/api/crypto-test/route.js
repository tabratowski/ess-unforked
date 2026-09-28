// app/api/crypto-test/route.ts
import { NextResponse } from "next/server";
import { webcrypto } from "node:crypto";

export const runtime = "nodejs"; // important: do not run on edge

export async function GET() {
  const key = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const raw = new Uint8Array(await webcrypto.subtle.exportKey("raw", key));
  console.log("Generated AES-256 key (hex):", Buffer.from(raw).toString("hex"));
  return NextResponse.json({
    keyLength: raw.length, // should be 32 bytes for AES-256
    keyHexPreview: Buffer.from(raw).toString("hex").slice(0, 16),
  });
}
