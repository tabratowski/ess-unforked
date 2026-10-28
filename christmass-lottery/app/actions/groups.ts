"use server";

import { revalidatePath } from "next/cache";
import { sendMail } from "@/lib/mail";
import { isOwner } from "@/lib/owner";
import { getSession } from "@/lib/session";
import type { FormState } from "@/lib/types";
import { validateCapacity } from "@/lib/validation";
import { createGroup, getAssignment, joinGroup, WpError } from "@/lib/wp";

const JOIN_ERRORS: Record<string, string> = {
  group_full: "This group is already full.",
  already_member: "You're already in this group.",
  group_drawn: "This group has already been drawn.",
};

export async function createGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || !isOwner(session.email)) return { error: "Only the owner can create groups." };
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Give the group a name." };
  const capacity = validateCapacity(fd.get("capacity"));
  if (!capacity.ok) return { error: capacity.error };
  try {
    await createGroup(name, capacity.value);
  } catch (e) {
    console.error("createGroupAction", e);
    return { error: "Couldn't create the group. Please try again." };
  }
  revalidatePath("/groups");
  return { message: `Group "${name}" created.` };
}

export async function joinGroupAction(groupId: number): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: "Please log in again." };
  try {
    await joinGroup(groupId, session.id);
  } catch (e) {
    if (e instanceof WpError && JOIN_ERRORS[e.code]) return { error: JOIN_ERRORS[e.code] };
    console.error("joinGroupAction", e);
    return { error: "Couldn't join the group. Please try again." };
  }
  revalidatePath("/groups");
  return {};
}

export async function drawAction(groupId: number): Promise<{ error?: string; receiverLogin?: string }> {
  const session = await getSession();
  if (!session) return { error: "Please log in again." };
  let assignment;
  try {
    assignment = await getAssignment(groupId, session.id);
  } catch (e) {
    console.error("drawAction", e);
    return { error: "Couldn't load your draw. Please try again." };
  }
  if (!assignment) return { error: "Your group hasn't been drawn yet or you're not a member." };
  try {
    await sendMail({
      to: session.email,
      subject: `Christmass Lottery: your draw in ${assignment.groupName}`,
      text: `You are buying a present for ${assignment.receiverLogin}.`,
    });
  } catch (e) {
    console.error("drawAction mail", e);
    return { receiverLogin: assignment.receiverLogin, error: "Couldn't send the email, but here's your draw." };
  }
  return { receiverLogin: assignment.receiverLogin };
}
