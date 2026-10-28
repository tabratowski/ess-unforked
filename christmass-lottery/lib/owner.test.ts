import { afterEach, describe, expect, it, vi } from "vitest";
import { isOwner } from "./owner";

describe("isOwner", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("matches the default owner ignoring case and whitespace", () => {
    vi.stubEnv("OWNER_EMAIL", "");
    expect(isOwner(" Tomasz.Abratowski@Gmail.com ")).toBe(true);
  });

  it("rejects other or missing emails", () => {
    expect(isOwner("x@y.z")).toBe(false);
    expect(isOwner(undefined)).toBe(false);
    expect(isOwner(null)).toBe(false);
  });

  it("respects OWNER_EMAIL override", () => {
    vi.stubEnv("OWNER_EMAIL", " Boss@Example.com ");
    expect(isOwner("boss@example.com")).toBe(true);
    expect(isOwner("tomasz.abratowski@gmail.com")).toBe(false);
  });
});
