import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShotEditForm } from "./shot-edit-form";
import type { Bean, Equipment, Shot } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  updateShot: vi.fn().mockResolvedValue({ ok: true, message: "aktualisiert" }),
  invalidateShotData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: mocks.back, push: mocks.push }) }));
vi.mock("@/features/data/actions", () => ({ updateShot: mocks.updateShot }));
vi.mock("@/hooks/use-private-cache", () => ({
  usePrivateCache: () => ({ invalidateShotData: mocks.invalidateShotData }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const bean: Bean = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "user-1",
  name: "Test Bean",
  roaster: "Test Roaster",
  roast_date: null,
  origin: null,
  process: "unknown",
  roast_level: null,
  tasting_notes: [],
  purchase_date: null,
  price_cents: null,
  package_grams: null,
  is_decaf: false,
  archived_at: null,
  created_at: "",
  updated_at: "",
};

const equipment = (id: string, type: Equipment["type"], name: string): Equipment => ({
  id,
  user_id: "user-1",
  type,
  name,
  notes: null,
  archived_at: null,
  created_at: "",
  updated_at: "",
});
const machine = equipment("44444444-4444-4444-8444-444444444444", "machine", "Test Maschine");
const grinder = equipment("55555555-5555-4555-8555-555555555555", "grinder", "Test Mühle");

const shot: Shot = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: "user-1",
  bean_id: bean.id,
  machine_id: machine.id,
  grinder_id: grinder.id,
  basket_id: null,
  shot_at: "2026-07-13T08:00:00Z",
  grind_setting: "5",
  dose_grams: 18,
  prep_tools: ["WDT"],
  extraction_seconds: 30,
  stop_weight_grams: 34,
  final_yield_grams: 36,
  taste: "balanced",
  flow: "even",
  puck: "ideal",
  notes: "Schokoladig",
  score: 91,
  overall_taste_rating: 4,
  target_recipe_snapshot: {
    doseGrams: 18,
    targetYieldGrams: 36,
    targetExtractionTimeSeconds: 30,
    grindSetting: "5",
    prepTools: ["WDT"],
  },
  applied_recommendation_id: null,
  recommendation_applied: false,
  recommendation_changes: null,
  experiment_mode: false,
  scoring_version: "2.0.0-simple",
  score_coverage: 100,
  score_status: "Sehr detailliert",
  created_at: "",
  updated_at: "",
};

describe("ShotEditForm", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateShot.mockResolvedValue({ ok: true, message: "aktualisiert" });
  });

  it("verwendet dieselbe Abschnittsreihenfolge und zeigt keine Legacy-Felder", () => {
    render(<ShotEditForm userId="user-1" shot={shot} beans={[bean]} equipment={[machine, grinder]} />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Setup",
      "Extraktion",
      "Bewertung",
    ]);
    expect(screen.queryByText(/erster Tropfen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Druck/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Astringenz/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tamper" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Papierfilter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leicht sauer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leicht bitter" })).toBeInTheDocument();
    expect(screen.queryByText("Gesamtbewertung")).not.toBeInTheDocument();
  });

  it("bricht ohne Mutation ab", () => {
    render(<ShotEditForm userId="user-1" shot={shot} beans={[bean]} equipment={[machine, grinder]} />);

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(mocks.back).toHaveBeenCalledOnce();
    expect(mocks.updateShot).not.toHaveBeenCalled();
  });

  it("speichert alle vereinfachten Werte über die zentrale Update-Aktion", async () => {
    render(<ShotEditForm userId="user-1" shot={shot} beans={[bean]} equipment={[machine, grinder]} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Finales Getränkgewicht" }), { target: { value: "37" } });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => expect(mocks.updateShot).toHaveBeenCalledOnce());
    expect(mocks.updateShot.mock.calls[0][0]).toBe(shot.id);
    expect(mocks.updateShot.mock.calls[0][1].finalYieldGrams).toBe(37);
    expect(mocks.updateShot.mock.calls[0][1].machineId).toBe(machine.id);
    expect(mocks.updateShot.mock.calls[0][1].grinderId).toBe(grinder.id);
    expect(mocks.invalidateShotData).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", shotId: shot.id }));
    expect(mocks.push).toHaveBeenCalledWith(`/app/shots/${shot.id}`);
  });
});
