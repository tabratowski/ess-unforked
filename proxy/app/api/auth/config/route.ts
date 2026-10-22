import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
    const env = process.env;

    return NextResponse.json(
        { clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "" },
        { headers: { "Cache-Control": "no-store" } },
    );
}