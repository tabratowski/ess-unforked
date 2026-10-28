import { beforeEach, describe, expect, it, vi } from "vitest";

const { session, wp } = vi.hoisted(() => ({
  session: { getSession: vi.fn() },
  wp: { updateGroup: vi.fn(), removeMember: vi.fn(), redrawGroup: vi.fn(), deleteGroup: vi.fn() },
}));
vi.mock("@/lib/session", () => session);
vi.mock("@/lib/wp", async (orig) => ({ ...(await orig<typeof import("@/lib/wp")>()), ...wp }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { WpError } from "@/lib/wp";
import { deleteGroupAction, redrawGroupAction, removeMemberAction, updateGroupAction } from "./manage";

const owner = { id: 1, login: "tomasz", email: "tomasz.abratowski@gmail.com" };
const stranger = { id: 2, login: "elf", email: "elf@north.pole" };

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("manage actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OWNER_EMAIL", "");
  });

  it.each([null, stranger])("refuse anyone but the owner (%o)", async (who) => {
    session.getSession.mockResolvedValue(who);
    const results = [
      await updateGroupAction({}, form({ groupId: "3", name: "x", capacity: "4" })),
      await removeMemberAction(3, 9),
      await redrawGroupAction(3),
      await deleteGroupAction(3),
    ];
    for (const r of results) expect(r.error).toMatch(/only the owner/i);
    for (const fn of Object.values(wp)) expect(fn).not.toHaveBeenCalled();
  });

  it("updates name and capacity for the owner", async () => {
    session.getSession.mockResolvedValue(owner);
    const r = await updateGroupAction({}, form({ groupId: "3", name: " Office ", capacity: "6" }));
    expect(wp.updateGroup).toHaveBeenCalledWith(3, { name: "Office", capacity: 6 });
    expect(r.message).toMatch(/saved/i);
  });

  it("validates the edit form before calling WordPress", async () => {
    session.getSession.mockResolvedValue(owner);
    expect((await updateGroupAction({}, form({ groupId: "3", name: "", capacity: "6" }))).error).toMatch(/name/i);
    expect((await updateGroupAction({}, form({ groupId: "3", name: "x", capacity: "5" }))).error).toMatch(/even/i);
    expect((await updateGroupAction({}, form({ groupId: "abc", name: "x", capacity: "6" }))).error).toBeTruthy();
    expect(wp.updateGroup).not.toHaveBeenCalled();
  });

  it("shows WordPress's message for rule conflicts", async () => {
    session.getSession.mockResolvedValue(owner);
    wp.updateGroup.mockRejectedValue(
      new WpError("capacity_below_members", 409, "Capacity cannot be lower than the number of people already in the group."),
    );
    const r = await updateGroupAction({}, form({ groupId: "3", name: "x", capacity: "2" }));
    expect(r.error).toBe("Capacity cannot be lower than the number of people already in the group.");
  });

  it("removes, redraws and deletes for the owner", async () => {
    session.getSession.mockResolvedValue(owner);
    expect(await removeMemberAction(3, 9)).toEqual({});
    expect(await redrawGroupAction(3)).toEqual({});
    expect(await deleteGroupAction(3)).toEqual({});
    expect(wp.removeMember).toHaveBeenCalledWith(3, 9);
    expect(wp.redrawGroup).toHaveBeenCalledWith(3);
    expect(wp.deleteGroup).toHaveBeenCalledWith(3);
  });
});
