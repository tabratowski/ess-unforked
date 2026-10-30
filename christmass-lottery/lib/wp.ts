import "server-only";
import type { Assignment, Group, User } from "./types";

export class WpError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "WpError";
  }
}

async function wpFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const base = (process.env.WP_URL ?? "").replace(/\/+$/, "");
  const auth = Buffer.from(`${process.env.WP_APP_USER}:${process.env.WP_APP_PASSWORD}`).toString("base64");
  const res = await fetch(`${base}/wp-json/cl/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new WpError(data.code ?? "wp_error", res.status, data.message ?? `WordPress request failed (${res.status})`);
  }
  return data as T;
}

// Ids come from server action arguments, which the client controls; never let them shape the URL.
function id(n: number): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid id");
  return n;
}

async function nullOn<T>(status: number, p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof WpError && e.status === status) return null;
    throw e;
  }
}

export function registerUser(i: { login: string; email: string; password: string }): Promise<User> {
  return wpFetch<User>("/users", { method: "POST", body: i });
}

export function verifyCredentials(login: string, password: string): Promise<User | null> {
  return nullOn(401, wpFetch<User>("/auth", { method: "POST", body: { login, password } }));
}

export function createResetKey(email: string): Promise<{ login: string; key: string } | null> {
  return nullOn(404, wpFetch("/password-reset", { method: "POST", body: { email } }));
}

export async function resetPassword(login: string, key: string, password: string): Promise<void> {
  await wpFetch("/password-reset/confirm", { method: "POST", body: { login, key, password } });
}

export async function listGroups(userId: number): Promise<Group[]> {
  return wpFetch<Group[]>(`/groups?user_id=${id(userId)}`);
}

export function createGroup(name: string, capacity: number): Promise<Group> {
  return wpFetch<Group>("/groups", { method: "POST", body: { name, capacity } });
}

export async function joinGroup(groupId: number, userId: number): Promise<Group> {
  return wpFetch<Group>(`/groups/${id(groupId)}/join`, { method: "POST", body: { user_id: id(userId) } });
}

export async function getAssignment(groupId: number, userId: number): Promise<Assignment | null> {
  return nullOn(404, wpFetch<Assignment>(`/groups/${id(groupId)}/assignment?user_id=${id(userId)}`));
}

export async function listMembers(groupId: number): Promise<User[]> {
  return wpFetch<User[]>(`/groups/${id(groupId)}/members`);
}

export async function updateGroup(groupId: number, changes: { name?: string; capacity?: number }): Promise<Group> {
  return wpFetch<Group>(`/groups/${id(groupId)}`, { method: "PATCH", body: changes });
}

export async function deleteGroup(groupId: number): Promise<void> {
  await wpFetch(`/groups/${id(groupId)}`, { method: "DELETE" });
}

export async function removeMember(groupId: number, userId: number): Promise<Group> {
  return wpFetch<Group>(`/groups/${id(groupId)}/members/${id(userId)}`, { method: "DELETE" });
}

export async function redrawGroup(groupId: number): Promise<Group> {
  return wpFetch<Group>(`/groups/${id(groupId)}/redraw`, { method: "POST" });
}

export async function revealAssignment(groupId: number, userId: number): Promise<Assignment | null> {
  return nullOn(404, wpFetch<Assignment>(`/groups/${id(groupId)}/reveal`, { method: "POST", body: { user_id: id(userId) } }));
}
