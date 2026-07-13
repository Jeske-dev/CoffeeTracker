import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShotWizard } from "./shot-wizard";
import type { Bean, RecommendationBundleRecord } from "@/types/domain";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), saveShot: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/features/data/actions", () => ({ saveShot: mocks.saveShot }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const bean: Bean = {
  id: "11111111-1111-4111-8111-111111111111", user_id: "user-1", name: "Test Bean", roaster: "Test Roaster", roast_date: null,
  origin: null, process: "unknown", roast_level: null, tasting_notes: [], purchase_date: null, price_cents: null,
  package_grams: null, is_decaf: false, archived_at: null, created_at: "", updated_at: "",
};
const recommendation = {
  id: "22222222-2222-4222-8222-222222222222", user_id: "user-1", source_shot_id: "33333333-3333-4333-8333-333333333333", bean_id: bean.id,
  machine_id: null, grinder_id: null, basket_id: null, target_recipe_snapshot: { doseGrams: 18, targetYieldGrams: 36, targetExtractionTimeSeconds: 30, temperatureCelsius: 93, grindSetting: "5", prepTools: ["Tamper"] }, engine_version: "1.0.0",
  primary_action: { actionType: "GRIND_FINER", priorityTier: 4, severity: 1, confidence: .7, expectedImpact: .7, personalEffectiveness: .5, title: "Mahlgrad auf 4 stellen", summary: "Flow verlangsamen", explanation: "Test", changes: [{ field: "grindSetting", previousValue: "5", recommendedValue: "4" }], evidence: [], suppressedReasons: [] },
  execution_adjustments: { recommendedStopWeightGrams: 34, expectedOvershootGrams: 2, sampleSize: 3, confidence: .65 }, confidence: .7, confidence_label: "Mittlere Sicherheit", evidence: [], status: "applied", applied_at: "", dismissed_at: null, resulting_shot_id: null, user_feedback: null, outcome: null, created_at: "", updated_at: "",
} as RecommendationBundleRecord;

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

  it("übernimmt eine Empfehlung sichtbar und lässt das Feld rückgängig machen", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null} recommendation={recommendation}/>);
    expect(await screen.findByDisplayValue("4")).toBeInTheDocument();
    expect(screen.getByText("Empfohlen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Empfehlung rückgängig" }));
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });
});
