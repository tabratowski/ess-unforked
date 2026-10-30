// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { drawAction } = vi.hoisted(() => ({ drawAction: vi.fn() }));
vi.mock("@/app/actions/groups", () => ({ drawAction }));

import DrawButton from "./DrawButton";

describe("DrawButton", () => {
  beforeEach(() => drawAction.mockResolvedValue({ receiverLogin: "santa" }));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("offers Losuj when the user hasn't drawn yet", () => {
    render(<DrawButton groupId={3} receiverLogin={null} />);
    expect((screen.getByRole("button", { name: "Losuj" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Wyślij ponownie mail" })).toBeNull();
  });

  it("greys out Losuj and offers resend once already drawn", () => {
    render(<DrawButton groupId={3} receiverLogin="santa" />);
    expect((screen.getByRole("button", { name: "Losuj" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Wyślij ponownie mail" })).toBeTruthy();
    expect(screen.getByText("santa")).toBeTruthy();
  });

  it("switches to the drawn state after clicking Losuj", async () => {
    const user = userEvent.setup();
    render(<DrawButton groupId={3} receiverLogin={null} />);
    await user.click(screen.getByRole("button", { name: "Losuj" }));
    await waitFor(() => expect(screen.getByText("santa")).toBeTruthy());
    expect((screen.getByRole("button", { name: "Losuj" }) as HTMLButtonElement).disabled).toBe(true);
    expect(drawAction).toHaveBeenCalledWith(3);
  });

  it("resends the email and confirms it", async () => {
    const user = userEvent.setup();
    render(<DrawButton groupId={3} receiverLogin="santa" />);
    await user.click(screen.getByRole("button", { name: "Wyślij ponownie mail" }));
    await waitFor(() => expect(screen.getByText("Wysłano ponownie.")).toBeTruthy());
    expect(drawAction).toHaveBeenCalledWith(3);
  });
});
