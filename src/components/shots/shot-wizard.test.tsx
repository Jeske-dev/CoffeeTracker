import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShotWizard } from "./shot-wizard";
import type { Bean } from "@/types/domain";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), saveShot: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/features/data/actions", () => ({ saveShot: mocks.saveShot }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const bean: Bean = {
  id: "11111111-1111-4111-8111-111111111111", user_id: "user-1", name: "Test Bean", roaster: "Test Roaster", roast_date: null,
  origin: null, process: "unknown", roast_level: null, tasting_notes: [], purchase_date: null, price_cents: null,
  package_grams: null, is_decaf: false, archived_at: null, created_at: "", updated_at: "",
};

describe("ShotWizard", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });

  it("öffnet nach der Extraktion das Review, ohne den Shot zu speichern", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null}/>);

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByText("Extraktion läuft.");
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    await screen.findByText("Wie war der Shot?");
    expect(mocks.saveShot).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Review abschließen & speichern" })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("dialed:shot-draft:user-1")).not.toBeNull());
  });

  it("behält den Entwurf offline und deaktiviert das endgültige Speichern", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null}/>);

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByText("Extraktion läuft.");
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    const save = await screen.findByRole("button", { name: "Offline – Entwurf bleibt erhalten" });
    expect(save).toBeDisabled();
    expect(mocks.saveShot).not.toHaveBeenCalled();
    await waitFor(() => expect(localStorage.getItem("dialed:shot-draft:user-1")).not.toBeNull());
  });
});
