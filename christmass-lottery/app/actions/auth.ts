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
  if (!login || !password) return { error: "Podaj login i hasło." };
  try {
    const user = await verifyCredentials(login, password);
    if (!user) return { error: "Nieprawidłowy login lub hasło." };
    await createSession(user);
  } catch (e) {
    console.error("loginAction", e);
    return { error: "Coś poszło nie tak. Spróbuj ponownie." };
  }
  redirect("/groups");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const message = "Jeśli takie konto istnieje, wysłaliśmy maila.";
  const email = str(fd, "email").trim().toLowerCase();
  if (!email) return { error: "Podaj swój email." };
  try {
    const reset = await createResetKey(email);
    if (reset) {
      const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
      const link = `${base}/reset-password?login=${encodeURIComponent(reset.login)}&key=${encodeURIComponent(reset.key)}`;
      await sendMail({
        to: email,
        subject: "Christmass Lottery: zresetuj hasło",
        text: `Cześć ${reset.login},\n\nZresetuj swoje hasło tutaj:\n${link}\n\nJeśli nie prosiłeś o to, zignoruj tego maila.`,
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
    if (e instanceof WpError && e.code === "invalid_key") return { error: "Ten link do resetowania hasła jest nieprawidłowy lub wygasł." };
    console.error("resetPasswordAction", e);
    return { error: "Coś poszło nie tak. Spróbuj ponownie." };
  }
  redirect("/login?reset=1");
}
