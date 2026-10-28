import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { signSession, verifySession } from "./session";

describe("session tokens", () => {
  beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-secret-test-secret-test-secret"));

  const s = { id: 7, login: "elf", email: "elf@north.pole" };

  it("round-trips a session", async () => {
    expect(await verifySession(await signSession(s))).toEqual(s);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(s);
    const [h, , sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...s, id: 1 })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${sig}`)).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
  });
});
