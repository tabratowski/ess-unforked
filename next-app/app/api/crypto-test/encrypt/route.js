// app/api/crypto-test/route.ts
import { encryptWithPublicKey } from "@/lib/encrypt";
import { NextResponse } from "next/server";
export const runtime = "nodejs"; // important: do not run on edge

export async function GET() {
  try {
    const { value, kid } = await encryptWithPublicKey({
      originUrls: "['https://monetization.wpenginepoweredstaging.com']",
      surfaceSlug: "web2",
      mosSecretKey:
        "sk_preview_68feffd6_MmVhMjY5YWQuZTMzZjQyZDQuODU2YTRjMzctNDhkMy00Y2U2LTgyOTItY2Y3NGI2NzNlZWI2",
    });
    return NextResponse.json({ data: value, kid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(message);
    return NextResponse.json(
      { error: "Encryption failed", details: message },
      { status: 500 },
    );
  }
}
