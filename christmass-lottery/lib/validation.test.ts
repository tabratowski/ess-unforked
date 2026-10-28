import { describe, expect, it } from "vitest";
import { validateCapacity, validateField, validatePassword, validateRegistration } from "./validation";

describe("validateCapacity", () => {
  it.each(["4", 4, "100", "2"])("accepts %s", (input) => {
    const r = validateCapacity(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(Number(input));
  });

  it.each(["4.5", "-2", "abc", "", "3", "0", "102", null, undefined])("rejects %s", (input) => {
    const r = validateCapacity(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/even/i);
  });
});

describe("validateRegistration", () => {
  const valid = { login: "santa", email: "a@b.co", password: "12345678" };

  it.each([
    { ...valid, login: "ab" },
    { ...valid, login: "a b" },
    { ...valid, email: "x" },
    { ...valid, password: "short" },
  ])("rejects %o", (input) => {
    expect(validateRegistration(input).ok).toBe(false);
  });

  it("trims login and normalises email", () => {
    const r = validateRegistration({ login: " santa ", email: " A@B.CO ", password: "12345678" });
    expect(r).toEqual({ ok: true, value: { login: "santa", email: "a@b.co", password: "12345678" } });
  });
});

describe("validateField", () => {
  it.each([
    ["login", "ab", /3–30/],
    ["login", "a b c", /3–30/],
    ["email", "x@", /valid email/],
    ["password", "1234567", /8 characters/],
    ["capacity", "3", /even/],
    ["required", "   ", /required/],
  ] as const)("%s rejects %j", (rule, value, msg) => {
    expect(validateField(rule, value)).toMatch(msg);
  });

  it.each([
    ["login", " santa "],
    ["email", " A@B.CO "],
    ["password", "12345678"],
    ["capacity", "4"],
    ["required", "x"],
  ] as const)("%s accepts %j", (rule, value) => {
    expect(validateField(rule, value)).toBeUndefined();
  });
});

describe("validatePassword", () => {
  it("requires at least 8 characters", () => {
    expect(validatePassword("1234567").ok).toBe(false);
    expect(validatePassword("12345678")).toEqual({ ok: true, value: "12345678" });
  });
});
