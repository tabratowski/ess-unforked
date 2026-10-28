"use server";

import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { createSession, destroySession } from "@/lib/session";
import type { FormState } from "@/lib/types";
import { validatePassword, validateRegistration } from "@/lib/validation";
import { createResetKey, registerUser, resetPassword, verifyCredentials, WpError } from "@/lib/wp";

const str = (fd: FormData, name: string) => String(fd.get(name) ?? "");

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = validateRegistration({ login: str(fd, "login"), email: str(fd, "email"), password: str(fd, "password") });
  if (!v.ok) return { error: v.error };
  try {
    const user = await registerUser(v.value);
    await createSession(user);
  } catch (e) {
    if (e instanceof WpError && e.code === "login_taken") return { error: "That login is already registered." };
    if (e instanceof WpError && e.code === "email_taken") return { error: "That email is already registered." };
    if (e instanceof WpError && e.code === "invalid_input") return { error: e.message };
    console.error("registerAction", e);
    return { error: "Something went wrong. Please try again." };
  }
  redirect("/groups");
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const login = str(fd, "login").trim();
  const password = str(fd, "password");
  if (!login || !password) return { error: "Enter your login and password." };
  try {
    const user = await verifyCredentials(login, password);
    if (!user) return { error: "Wrong login or password." };
    await createSession(user);
  } catch (e) {
    console.error("loginAction", e);
    return { error: "Something went wrong. Please try again." };
  }
  redirect("/groups");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const message = "If that account exists, we've sent an email.";
  const email = str(fd, "email").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };
  try {
    const reset = await createResetKey(email);
    if (reset) {
      const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
      const link = `${base}/reset-password?login=${encodeURIComponent(reset.login)}&key=${encodeURIComponent(reset.key)}`;
      await sendMail({
        to: email,
        subject: "Christmass Lottery: reset your password",
        text: `Hi ${reset.login},\n\nReset your password here:\n${link}\n\nIf you didn't ask for this, ignore this email.`,
      });
    }
  } catch (e) {
    console.error("forgotPasswordAction", e);
  }
  return { message };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const pw = validatePassword(str(fd, "password"));
  if (!pw.ok) return { error: pw.error };
  try {
    await resetPassword(str(fd, "login"), str(fd, "key"), pw.value);
  } catch (e) {
    if (e instanceof WpError && e.code === "invalid_key") return { error: "This reset link is invalid or expired." };
    console.error("resetPasswordAction", e);
    return { error: "Something went wrong. Please try again." };
  }
  redirect("/login?reset=1");
}
