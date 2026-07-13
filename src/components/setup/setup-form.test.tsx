import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SetupForm } from "./setup-form";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveSetup: vi.fn().mockResolvedValue({ ok: true, message: "Setup wurde gespeichert" }),
  success: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/features/data/actions", () => ({ saveSetup: mocks.saveSetup }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn() } }));

describe("SetupForm", () => {
  it("sendet Maschine und Mühle über den Speichern-Button ab", async () => {
    render(<SetupForm displayName="Brian" email="brian@example.com" equipment={[]} settings={null}/>);

    fireEvent.change(screen.getByLabelText("Siebträgermaschine"), { target: { value: "Linea Mini" } });
    fireEvent.change(screen.getByLabelText("Mühle"), { target: { value: "Niche Zero" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalled());
    expect(mocks.saveSetup).toHaveBeenCalledWith(expect.objectContaining({ machineName: "Linea Mini", grinderName: "Niche Zero" }));
    expect(mocks.success).toHaveBeenCalledWith("Setup wurde gespeichert", expect.any(Object));
  });
});
