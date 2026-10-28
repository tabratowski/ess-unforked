"use server";

import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/owner";
import { getSession } from "@/lib/session";
import type { FormState } from "@/lib/types";
import { validateCapacity } from "@/lib/validation";
import { deleteGroup, redrawGroup, removeMember, updateGroup, WpError } from "@/lib/wp";

const NOT_OWNER: FormState = { error: "Only the owner can manage groups." };

async function ownerOnly(): Promise<boolean> {
  const session = await getSession();
  return !!session && isOwner(session.email);
}

// Run a WordPress change, turning rule conflicts (4xx) into the plugin's friendly message.
async function run(label: string, fn: () => Promise<unknown>): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof WpError && e.status >= 400 && e.status < 500) return { error: e.message };
    console.error(label, e);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath("/groups");
  revalidatePath("/groups/manage");
  return {};
}

export async function updateGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return NOT_OWNER;
  const groupId = Number(fd.get("groupId"));
  if (!Number.isInteger(groupId) || groupId <= 0) return { error: "Unknown group." };
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Give the group a name." };
  const capacity = validateCapacity(fd.get("capacity"));
  if (!capacity.ok) return { error: capacity.error };
  const result = await run("updateGroupAction", () => updateGroup(groupId, { name, capacity: capacity.value }));
  return result.error ? result : { message: "Saved." };
}

export async function removeMemberAction(groupId: number, userId: number): Promise<FormState> {
  if (!(await ownerOnly())) return NOT_OWNER;
  return run("removeMemberAction", () => removeMember(groupId, userId));
}

export async function redrawGroupAction(groupId: number): Promise<FormState> {
  if (!(await ownerOnly())) return NOT_OWNER;
  return run("redrawGroupAction", () => redrawGroup(groupId));
}

export async function deleteGroupAction(groupId: number): Promise<FormState> {
  if (!(await ownerOnly())) return NOT_OWNER;
  return run("deleteGroupAction", () => deleteGroup(groupId));
}
