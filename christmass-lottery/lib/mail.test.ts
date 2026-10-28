import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send, createTransport } = vi.hoisted(() => {
  const send = vi.fn();
  return { send, createTransport: vi.fn(() => ({ sendMail: send })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));

import { sendMail } from "./mail";

describe("sendMail", () => {
  beforeEach(() => {
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
    send.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    send.mockReset();
    createTransport.mockClear();
  });

  it("sends through Gmail SMTP as the default sender with the app password", async () => {
    vi.stubEnv("MAIL_FROM", "");
    await sendMail({ to: "elf@north.pole", subject: "Losowanie 🎄 Święta", text: "Kupujesz prezent dla Łukasz" });
    expect(createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: { user: "tomasz.abratowski@gmail.com", pass: "abcd efgh ijkl mnop" },
    });
    expect(send).toHaveBeenCalledWith({
      from: "tomasz.abratowski@gmail.com",
      to: "elf@north.pole",
      subject: "Losowanie 🎄 Święta",
      text: "Kupujesz prezent dla Łukasz",
    });
  });

  it("uses MAIL_FROM when set", async () => {
    vi.stubEnv("MAIL_FROM", "santa@gmail.com");
    await sendMail({ to: "a@b.co", subject: "s", text: "t" });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: "santa@gmail.com", pass: "abcd efgh ijkl mnop" } }),
    );
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: "santa@gmail.com" }));
  });

  it("fails clearly when the app password is missing", async () => {
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    await expect(sendMail({ to: "a@b.co", subject: "s", text: "t" })).rejects.toThrow(/GMAIL_APP_PASSWORD/);
    expect(send).not.toHaveBeenCalled();
  });
});
