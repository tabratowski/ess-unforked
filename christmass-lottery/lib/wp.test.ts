import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createResetKey,
  deleteGroup,
  getAssignment,
  joinGroup,
  listGroups,
  listMembers,
  redrawGroup,
  removeMember,
  revealAssignment,
  updateGroup,
  verifyCredentials,
  WpError,
} from "./wp";

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("wp client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("WP_URL", "https://wp.example.com/");
    vi.stubEnv("WP_APP_USER", "admin");
    vi.stubEnv("WP_APP_PASSWORD", "abcd efgh");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("authenticates with Basic auth against the cl/v1 namespace", async () => {
    fetchMock.mockResolvedValue(respond(200, { id: 1, login: "santa", email: "s@x.io" }));
    const user = await verifyCredentials("santa", "secret123");
    expect(user).toEqual({ id: 1, login: "santa", email: "s@x.io" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://wp.example.com/wp-json/cl/v1/auth");
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Basic " + Buffer.from("admin:abcd efgh").toString("base64"),
    );
    expect(JSON.parse(init.body)).toEqual({ login: "santa", password: "secret123" });
  });

  it("returns null for wrong credentials", async () => {
    fetchMock.mockResolvedValue(respond(401, { code: "invalid_credentials", message: "x", data: { status: 401 } }));
    expect(await verifyCredentials("santa", "nope")).toBeNull();
  });

  it("returns null when reset email is unknown", async () => {
    fetchMock.mockResolvedValue(respond(404, { code: "not_found", message: "x", data: { status: 404 } }));
    expect(await createResetKey("ghost@x.io")).toBeNull();
  });

  it("returns null when assignment is not available", async () => {
    fetchMock.mockResolvedValue(respond(404, { code: "not_drawn", message: "x", data: { status: 404 } }));
    expect(await getAssignment(3, 1)).toBeNull();
  });

  it("throws WpError with WP's code on conflicts", async () => {
    fetchMock.mockResolvedValue(respond(409, { code: "group_full", message: "full", data: { status: 409 } }));
    const err = await joinGroup(3, 1).catch((e) => e);
    expect(err).toBeInstanceOf(WpError);
    expect(err.code).toBe("group_full");
    expect(err.status).toBe(409);
  });

  it.each(["5/assignment?user_id=7#", "../groups?name=X&capacity=2#", 1.5, -1, 0, NaN])(
    "refuses non-integer ids like %s without calling WordPress",
    async (bad) => {
      await expect(getAssignment(bad as unknown as number, 1)).rejects.toThrow(/invalid id/i);
      await expect(joinGroup(bad as unknown as number, 1)).rejects.toThrow(/invalid id/i);
      await expect(getAssignment(3, bad as unknown as number)).rejects.toThrow(/invalid id/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("lists groups for a user", async () => {
    fetchMock.mockResolvedValue(respond(200, []));
    await listGroups(5);
    expect(fetchMock.mock.calls[0][0]).toBe("https://wp.example.com/wp-json/cl/v1/groups?user_id=5");
  });

  it("reveals the caller's draw with POST and returns null when unavailable", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { groupName: "Office", receiverLogin: "elf" }));
    expect(await revealAssignment(3, 1)).toEqual({ groupName: "Office", receiverLogin: "elf" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://wp.example.com/wp-json/cl/v1/groups/3/reveal");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ user_id: 1 });

    fetchMock.mockResolvedValueOnce(respond(404, { code: "not_drawn", message: "x", data: { status: 404 } }));
    expect(await revealAssignment(3, 1)).toBeNull();
    await expect(revealAssignment("3/x#" as unknown as number, 1)).rejects.toThrow(/invalid id/i);
  });

  describe("group management", () => {
    it("lists members", async () => {
      fetchMock.mockResolvedValue(respond(200, [{ id: 2, login: "elf", email: "e@x.io" }]));
      expect(await listMembers(3)).toEqual([{ id: 2, login: "elf", email: "e@x.io" }]);
      expect(fetchMock.mock.calls[0][0]).toBe("https://wp.example.com/wp-json/cl/v1/groups/3/members");
    });

    it("updates name and capacity with PATCH", async () => {
      fetchMock.mockResolvedValue(respond(200, {}));
      await updateGroup(3, { name: "Office", capacity: 6 });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://wp.example.com/wp-json/cl/v1/groups/3");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ name: "Office", capacity: 6 });
    });

    it("deletes a group, removes a member and redraws", async () => {
      fetchMock.mockImplementation(async () => respond(200, {}));
      await deleteGroup(3);
      await removeMember(3, 9);
      await redrawGroup(3);
      expect(fetchMock.mock.calls.map(([u, i]) => `${i.method} ${u}`)).toEqual([
        "DELETE https://wp.example.com/wp-json/cl/v1/groups/3",
        "DELETE https://wp.example.com/wp-json/cl/v1/groups/3/members/9",
        "POST https://wp.example.com/wp-json/cl/v1/groups/3/redraw",
      ]);
    });

    it("surfaces capacity conflicts as WpError", async () => {
      fetchMock.mockResolvedValue(respond(409, { code: "capacity_below_members", message: "x", data: { status: 409 } }));
      await expect(updateGroup(3, { capacity: 2 })).rejects.toMatchObject({ code: "capacity_below_members" });
    });

    it.each(["3/redraw#", 0, 1.5])("refuses bad group id %s", async (bad) => {
      const id = bad as unknown as number;
      await expect(listMembers(id)).rejects.toThrow(/invalid id/i);
      await expect(updateGroup(id, { name: "x" })).rejects.toThrow(/invalid id/i);
      await expect(deleteGroup(id)).rejects.toThrow(/invalid id/i);
      await expect(removeMember(id, 1)).rejects.toThrow(/invalid id/i);
      await expect(removeMember(3, id)).rejects.toThrow(/invalid id/i);
      await expect(redrawGroup(id)).rejects.toThrow(/invalid id/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
