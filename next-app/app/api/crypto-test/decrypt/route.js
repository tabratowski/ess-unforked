// app/api/crypto-test/route.ts
import { NextResponse } from "next/server";
import { decryptCookie } from "@/lib/encrypt";

export const runtime = "nodejs"; // important: do not run on edge

export async function GET() {
  try {
    const data = await decryptCookie(
      "ZX6Z7BeTj4VJkkk/HBYFPL3TP5xiSawA/VqOKfu5H6eTWz7GtFtpt7GtpmR/h6U2MHb64OzGUnQ9uSEEXFiaUp3iUhz6poW7/c1+HMUEdVLvG3xq3KQpS3WYG0Ioz/2ftg5RDngcVK5RlnvvCCQXSWQkZTjlpBRYo7yUtGuGHVwghY1yZAB6tK0S19Yi6l8LVClpm8qurLNnbkBStK22kII/XYugea7tbdwSaGn+Aeb2AAWqsjTJxeoAVY1zlmjrK6TOIyKw3oty/5JDE4Pqh7RYk4QINhycNHbIfluDCVVOclGRZxo40LXRRFTgskVfrmNU47mJ70sv58MKDhcOg4dwB+SIR5tP2SUHUGVlNzAwOWQ2LTkyYWEtNDk1ZC1hMzFmLTY3NzQwY2ZiZjRlZf1I6hTVgYxgPeScYla8cMi4Gj2PAwBKlIclHbRrZUUZd3C9jHoSlDRPp9UcBGWYtRyD5LSVOCTBUpKcfFlpQHuy4R7/WG1GNFERrM7fXF8AV4352Whwcl6YM+lOmyHfZ30m0+CF27haKahke2MJBEOLQhhiIwLhGzqp5NoLDT9gu1m9Kte1yVe66sFYFDHH/WanWYOJsH28Xz6mc2ZOiZPlSX9uAdobcGSpBJ/RJzSWi8ZhPxBMXmtHd+dsRYicjnRVe7+osk/28uZI8QdsCPDzk0AZ3lpHe3s=",
    );
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "decryption failed", details: message },
      { status: 500 },
    );
  }
}
