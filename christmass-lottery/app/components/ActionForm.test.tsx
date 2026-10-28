// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormState } from "@/lib/types";
import ActionForm, { Field } from "./ActionForm";

function renderRegister(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  render(
    <ActionForm action={action} submitLabel="Create account">
      <Field label="Login" name="login" rule="login" />
      <Field label="Email" name="email" rule="email" />
      <Field label="Password" name="password" type="password" rule="password" />
    </ActionForm>,
  );
}

describe("ActionForm", () => {
  afterEach(cleanup);

  it("shows a field error after leaving the field and updates it while typing", async () => {
    const user = userEvent.setup();
    renderRegister(vi.fn());
    const login = screen.getByLabelText("Login");

    await user.type(login, "ab");
    expect(screen.queryByText(/3–30/)).toBeNull();
    await user.tab();
    expect(screen.getByText(/3–30/)).toBeTruthy();

    await user.type(login, "c");
    expect(screen.queryByText(/3–30/)).toBeNull();
  });

  it("does not submit while fields are invalid and shows every error", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    renderRegister(action);

    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText(/3–30/)).toBeTruthy();
    expect(screen.getByText(/valid email/)).toBeTruthy();
    expect(screen.getByText(/8 characters/)).toBeTruthy();
  });

  it("submits valid values and keeps them when the server returns an error", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_prev: FormState, _fd: FormData): Promise<FormState> => ({ error: "That login is already registered." }));
    renderRegister(action);

    await user.type(screen.getByLabelText("Login"), "santa");
    await user.type(screen.getByLabelText("Email"), "santa@north.pole");
    await user.type(screen.getByLabelText("Password"), "12345678");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByText("That login is already registered.")).toBeTruthy());
    const fd = action.mock.calls[0][1];
    expect(Object.fromEntries(fd)).toEqual({ login: "santa", email: "santa@north.pole", password: "12345678" });
    expect((screen.getByLabelText("Login") as HTMLInputElement).value).toBe("santa");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("santa@north.pole");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("12345678");
  });
});
