import { beforeEach, describe, expect, it, vi } from "vitest";

const { session, wp, mail } = vi.hoisted(() => ({
  session: { getSession: vi.fn() },
  wp: { revealAssignment: vi.fn() },
  mail: { sendMail: vi.fn() },
}));
vi.mock("@/lib/session", () => session);
vi.mock("@/lib/wp", async (orig) => ({ ...(await orig<typeof import("@/lib/wp")>()), ...wp }));
vi.mock("@/lib/mail", () => mail);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { drawAction } from "./groups";

const me = { id: 4, login: "elf", email: "elf@north.pole" };

describe("drawAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.getSession.mockResolvedValue(me);
    mail.sendMail.mockResolvedValue(undefined);
  });

  it("marks the draw as revealed and emails it to the caller", async () => {
    wp.revealAssignment.mockResolvedValue({ groupName: "Office", receiverLogin: "santa" });
    expect(await drawAction(3)).toEqual({ receiverLogin: "santa" });
    expect(wp.revealAssignment).toHaveBeenCalledWith(3, 4);
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "elf@north.pole", text: expect.stringContaining("santa") }),
    );
  });

  it("can be repeated to resend the email", async () => {
    wp.revealAssignment.mockResolvedValue({ groupName: "Office", receiverLogin: "santa" });
    await drawAction(3);
    await drawAction(3);
    expect(mail.sendMail).toHaveBeenCalledTimes(2);
  });

  it("returns a friendly error when the draw isn't available", async () => {
    wp.revealAssignment.mockResolvedValue(null);
    expect((await drawAction(3)).error).toBeTruthy();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
});
