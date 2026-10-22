import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
    const env = process.env;

    return NextResponse.json(
        {
            proxyUrl: env.NEXT_PUBLIC_PROXY_URL ?? "",
            tenantId: env.NEXT_PUBLIC_TENANT_ID ?? "",
            licenseId: env.NEXT_PUBLIC_LICENSE_KEY ?? "",
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}