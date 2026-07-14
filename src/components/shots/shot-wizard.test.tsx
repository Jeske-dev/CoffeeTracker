import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShotWizard } from "./shot-wizard";
import type { Bean, Equipment, RecommendationBundleRecord, Shot, UserSettings } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  saveShot: vi.fn(),
  applyRecommendation: vi.fn().mockResolvedValue({ ok: true, message: "ok" }),
  dismissRecommendation: vi.fn().mockResolvedValue({ ok: true, message: "ok" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/features/data/actions", () => ({
  saveShot: mocks.saveShot,
  applyRecommendation: mocks.applyRecommendation,
  dismissRecommendation: mocks.dismissRecommendation,
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const bean: Bean = {
  id: "11111111-1111-4111-8111-111111111111", user_id: "user-1", name: "Test Bean", roaster: "Test Roaster", roast_date: null,
  origin: "Colombia", process: "unknown", roast_level: null, tasting_notes: [], purchase_date: null, price_cents: null,
  package_grams: null, is_decaf: false, archived_at: null, created_at: "", updated_at: "",
};
const equipment = (id: string, type: Equipment["type"], name: string): Equipment => ({ id, user_id: "user-1", type, name, notes: null, archived_at: null, created_at: "", updated_at: "" });
const machine = equipment("44444444-4444-4444-8444-444444444444", "machine", "Test Maschine");
const grinder = equipment("55555555-5555-4555-8555-555555555555", "grinder", "Test Mühle");
const settings: UserSettings = {
  user_id: "user-1", default_machine_id: machine.id, default_grinder_id: grinder.id, last_bean_id: bean.id,
  auto_fill: true, default_prep_tools: ["WDT", "Tamper", "Puck Screen"], dial_in_suggestions_enabled: true,
  roast_age_warning_enabled: true, roast_age_warning_days: 45, created_at: "", updated_at: "",
};
const lastShot: Shot = {
  id: "33333333-3333-4333-8333-333333333333", user_id: "user-1", bean_id: bean.id, machine_id: machine.id,
  grinder_id: grinder.id, basket_id: null, shot_at: "2026-07-13T08:00:00Z", grind_setting: "5", dose_grams: 18,
  prep_tools: ["WDT", "Puck Screen"], extraction_seconds: 30, stop_weight_grams: 34, final_yield_grams: 36,
  taste: "balanced", flow: "even", puck: "ideal", notes: null, score: 90, overall_taste_rating: 4,
  target_recipe_snapshot: { doseGrams: 18, targetYieldGrams: 36, targetExtractionTimeSeconds: 30, grindSetting: "5", prepTools: ["WDT"] },
  applied_recommendation_id: null, recommendation_applied: false, recommendation_changes: null, experiment_mode: false,
  scoring_version: "2.0.0-simple", score_coverage: 100, score_status: "Sehr detailliert", created_at: "", updated_at: "",
};
const recommendation = {
  id: "22222222-2222-4222-8222-222222222222", user_id: "user-1", source_shot_id: lastShot.id, bean_id: bean.id,
  machine_id: machine.id, grinder_id: grinder.id, basket_id: null,
  target_recipe_snapshot: { doseGrams: 18, targetYieldGrams: 36, targetExtractionTimeSeconds: 30, grindSetting: "5", prepTools: ["WDT"] },
  engine_version: "2.0.0-simple",
  primary_action: { actionType: "GRIND_FINER", priorityTier: 3, severity: 1, confidence: 0.7, expectedImpact: 0.7, personalEffectiveness: 0.5, title: "Mahlgrad auf 4 stellen", summary: "Flow verlangsamen", explanation: "Für diesen Shot einen kleinen Schritt feiner mahlen.", changes: [{ field: "grindSetting", previousValue: "5", recommendedValue: "4" }], evidence: [], suppressedReasons: [] },
  execution_adjustments: { recommendedStopWeightGrams: 34, expectedOvershootGrams: 2, sampleSize: 3, confidence: 0.65 },
  confidence: 0.7, confidence_label: "Mittlere Sicherheit", evidence: [], status: "applied", applied_at: "", dismissed_at: null,
  resulting_shot_id: null, user_feedback: null, outcome: null, created_at: "", updated_at: "",
} as RecommendationBundleRecord;

describe("vereinfachter ShotWizard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("zeigt keine entfernten Diagnosefelder", () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    expect(screen.queryByText(/Tamp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Druck/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/erster Tropfen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Temperatur/i)).not.toBeInTheDocument();
  });

  it("füllt letzte Bohne, Maschine und Mühle voraus", () => {
    const { container } = render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    expect(screen.getByRole("combobox", { name: "Bohne wählen" })).toHaveTextContent("Test Bean");
    expect(screen.getByRole("img", { name: "Flagge Colombia" })).toBeInTheDocument();
    expect(screen.getByText("Test Maschine")).toBeInTheDocument();
    expect(screen.getByText("Test Mühle")).toBeInTheDocument();
    expect(container.querySelector('[data-entity-icon="machine"]')).toBeInTheDocument();
    expect(container.querySelector('[data-entity-icon="grinder"]')).toBeInTheDocument();
  });

  it("öffnet nach Extraktion die vereinfachte Bewertung, ohne zu speichern", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Extraktion" })).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Extraktionszeit" }), { target: { value: "28.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Bewertung" })).length).toBeGreaterThan(0);
    expect(mocks.saveShot).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Shot speichern" })).toBeInTheDocument();
    expect(screen.queryByText(/Flow-Details/i)).not.toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("dialed:shot-draft:user-1")).not.toBeNull());
  });

  it("führt den Timer über einen gespeicherten Startzeitpunkt und erlaubt weiterhin manuelle Zeit", async () => {
    let frame: FrameRequestCallback | undefined;
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;
      return 1;
    });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);

    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Extraktion" })).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Timer starten" }));
    await waitFor(() => expect(frame).toBeDefined());
    expect(JSON.parse(localStorage.getItem("dialed:shot-timer:user-1") ?? "null")).toEqual({ startedAt: 1_000, baseMs: 0 });

    now.mockReturnValue(3_500);
    act(() => frame?.(0));
    expect(screen.getByRole("spinbutton", { name: "Extraktionszeit" })).toHaveValue(2.5);

    fireEvent.click(screen.getByRole("button", { name: "Timer stoppen" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Extraktionszeit" }), { target: { value: "29.5" } });
    expect(screen.getByRole("spinbutton", { name: "Extraktionszeit" })).toHaveValue(29.5);
    expect(localStorage.getItem("dialed:shot-timer:user-1")).toBeNull();

    requestFrame.mockRestore();
    cancelFrame.mockRestore();
    now.mockRestore();
  });

  it("behält den Entwurf offline und deaktiviert das Speichern", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null} />);
    fireEvent(window, new Event("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Extraktion" })).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Extraktionszeit" }), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(await screen.findByRole("button", { name: "Offline – Entwurf bleibt erhalten" })).toBeDisabled();
  });

  it("übernimmt einen Dashboard-Tipp sichtbar und lässt ihn rückgängig machen", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} recommendation={recommendation} recommendationMode="apply" />);
    expect(await screen.findByDisplayValue("4")).toBeInTheDocument();
    expect(screen.getByText("Tipp")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tipp rückgängig" }));
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("ändert bei normalem Start den empfohlenen Wert nicht unbemerkt", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} recommendation={{ ...recommendation, status: "active" }} recommendationMode="suggest" />);
    expect(await screen.findByDisplayValue("5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Übernehmen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ausblenden" })).toBeInTheDocument();
  });
});
