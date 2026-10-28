export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_CAPACITY = 100;

export function validateCapacity(input: unknown): Result<number> {
  const error = `Capacity must be an even number between 2 and ${MAX_CAPACITY}.`;
  const str = typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
  if (!/^\d+$/.test(str)) return { ok: false, error };
  const value = Number(str);
  if (value < 2 || value > MAX_CAPACITY || value % 2 !== 0) return { ok: false, error };
  return { ok: true, value };
}

export function validatePassword(pw: string): Result<string> {
  if (pw.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  return { ok: true, value: pw };
}

const LOGIN_ERROR = "Login must be 3–30 characters: letters, digits, _ . -";
const EMAIL_ERROR = "Please enter a valid email.";
const isLogin = (v: string) => /^[A-Za-z0-9_.-]{3,30}$/.test(v.trim());
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export type FieldRule = "login" | "email" | "password" | "capacity" | "required";

/** Single-field check shared by the browser (live validation) and the server. */
export function validateField(rule: FieldRule, value: string): string | undefined {
  switch (rule) {
    case "login":
      return isLogin(value) ? undefined : LOGIN_ERROR;
    case "email":
      return isEmail(value) ? undefined : EMAIL_ERROR;
    case "password": {
      const r = validatePassword(value);
      return r.ok ? undefined : r.error;
    }
    case "capacity": {
      const r = validateCapacity(value);
      return r.ok ? undefined : r.error;
    }
    case "required":
      return value.trim() ? undefined : "This field is required.";
  }
}

export function validateRegistration(input: {
  login: string;
  email: string;
  password: string;
}): Result<{ login: string; email: string; password: string }> {
  const error =
    validateField("login", input.login) ??
    validateField("email", input.email) ??
    validateField("password", input.password);
  if (error) return { ok: false, error };
  return {
    ok: true,
    value: { login: input.login.trim(), email: input.email.trim().toLowerCase(), password: input.password },
  };
}
