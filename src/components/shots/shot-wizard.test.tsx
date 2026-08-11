import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShotWizard } from "./shot-wizard";
import type { Bean, Equipment, Shot, UserSettings } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  saveShot: vi.fn(),
  info: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/features/data/actions", () => ({
  saveShot: mocks.saveShot,
}));
vi.mock("sonner", () => ({ toast: { info: mocks.info, success: vi.fn(), error: vi.fn() } }));

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
    const { container } = render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    expect(container.querySelector("#new-shot-form")).toHaveClass("h-full", "overflow-hidden");
    expect(container.querySelector(".form-scroll-region")).toBeInTheDocument();
    expect(container.querySelector("[data-form-end-spacer]")).toHaveClass("h-20");
    expect(screen.queryByText(/Druck/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/erster Tropfen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Temperatur/i)).not.toBeInTheDocument();
  });

  it("meldet einen wiederhergestellten Draft auch unter Strict Mode nur einmal", async () => {
    localStorage.setItem("dialed:shot-draft:user-1", JSON.stringify({
      version: 2,
      step: 2,
      values: {
        beanId: bean.id,
        machineId: machine.id,
        grinderId: grinder.id,
        basketId: null,
        grindSetting: "5",
        doseGrams: 18,
        prepTools: ["WDT"],
        extractionSeconds: null,
        stopWeightGrams: 34,
        finalYieldGrams: 36,
        taste: null,
        flow: null,
        puck: null,
        notes: null,
        overallTasteRating: null,
        targetRecipeSnapshot: null,
        recommendationBundleId: null,
        recommendationApplied: false,
        recommendationChanges: [],
        experimentMode: false,
      },
      updatedAt: "2026-07-14T10:00:00Z",
    }));

    render(<StrictMode><ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} /></StrictMode>);
    await waitFor(() => expect(mocks.info).toHaveBeenCalledOnce());
    expect(mocks.info).toHaveBeenCalledWith("Shot-Entwurf fortgesetzt", { id: "shot-draft-restored" });
  });

  it("zeigt alle Puck-Prep-Werkzeuge aus den Einstellungen als Schalter", () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    for (const tool of ["WDT", "Tamper", "Puck Screen", "Leveler", "Papierfilter"]) {
      expect(screen.getByRole("button", { name: tool })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Tamper" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Leveler" }));
    expect(screen.getByRole("button", { name: "Leveler" })).toHaveAttribute("aria-pressed", "true");
  });

  it("füllt letzte Bohne, Maschine und Mühle voraus", () => {
    const { container } = render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    expect(screen.getByRole("combobox", { name: "Bohne wählen" })).toHaveTextContent("Test Bean");
    expect(screen.getByRole("img", { name: "Flagge Colombia" })).toBeInTheDocument();
    expect(screen.getByText("Test Maschine")).toBeInTheDocument();
    expect(screen.getByText("Test Mühle")).toBeInTheDocument();
    expect(container.querySelector('[data-entity-icon="machine"]')).toBeInTheDocument();
    expect(container.querySelector('[data-entity-icon="grinder"]')).toBeInTheDocument();
    expect(screen.queryByText("Sieb")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Setup ändern/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "In den Einstellungen ändern" })).toHaveAttribute("href", "/app/setup");
  });

  it("stellt die Dosis über Plus und Minus ein", () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);

    const dose = screen.getByRole("spinbutton", { name: "Dosis" });
    fireEvent.click(screen.getByRole("button", { name: "Dosis erhöhen" }));
    expect(dose).toHaveValue(18.1);
    fireEvent.click(screen.getByRole("button", { name: "Dosis verringern" }));
    expect(dose).toHaveValue(18);
  });

  it("öffnet nach Extraktion die vereinfachte Bewertung, ohne zu speichern", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Extraktion" })).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("slider", { name: "Extraktionszeit" }), { target: { value: "28.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Bewertung" })).length).toBeGreaterThan(0);
    expect(mocks.saveShot).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Shot speichern" })).toBeInTheDocument();
    expect(screen.queryByText(/Flow-Details/i)).not.toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("dialed:shot-draft:user-1")).not.toBeNull());
  });

  it("integriert Gewichte in den Verlauf und setzt Zeit sowie Stopptipp darunter", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} stopWeightHistory={[lastShot]} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Extraktion" })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Timer/i })).not.toBeInTheDocument();
    const weightGraphic = screen.getByLabelText(/Gewichtsverlauf:/);
    const stopWeight = within(weightGraphic).getByRole("spinbutton", { name: "Stop-Gewicht" });
    const finalWeight = within(weightGraphic).getByRole("spinbutton", { name: "Finales Getränkgewicht" });
    expect(stopWeight).toBeInTheDocument();
    expect(finalWeight).toBeInTheDocument();
    fireEvent.click(within(weightGraphic).getByRole("button", { name: "Stop-Gewicht erhöhen" }));
    expect(stopWeight).toHaveValue(34.1);
    fireEvent.click(within(weightGraphic).getByRole("button", { name: "Stop-Gewicht verringern" }));
    expect(stopWeight).toHaveValue(34);
    fireEvent.click(within(weightGraphic).getByRole("button", { name: "Finales Getränkgewicht erhöhen" }));
    expect(finalWeight).toHaveValue(36.1);
    fireEvent.click(within(weightGraphic).getByRole("button", { name: "Finales Getränkgewicht verringern" }));
    expect(finalWeight).toHaveValue(36);
    expect(screen.queryByText("Brew Ratio")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Stopptipp: bei 34,0 g stoppen")).toHaveTextContent("1 Shot mit gleicher Bohne und gleichem Mahlgrad");
    const extractionTime = screen.getByRole("slider", { name: "Extraktionszeit" });
    expect(extractionTime).toHaveAttribute("step", "0.5");
    fireEvent.change(extractionTime, { target: { value: "28.5" } });
    expect(extractionTime).toHaveValue("28.5");
    expect(screen.getByText("28,5 s")).toBeInTheDocument();
    expect(weightGraphic.compareDocumentPosition(extractionTime) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("behält den Entwurf offline und deaktiviert das Speichern", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[]} settings={null} lastShot={null} />);
    fireEvent(window, new Event("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect((await screen.findAllByRole("heading", { name: "Extraktion" })).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("slider", { name: "Extraktionszeit" }), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(await screen.findByRole("button", { name: "Offline – Entwurf bleibt erhalten" })).toBeDisabled();
  });

  it("zeigt den zeitbasierten Mahlgrad leise an, ohne Eingaben automatisch zu ändern", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={{ ...lastShot, extraction_seconds: 19 }} stopWeightHistory={[lastShot]} />);
    expect(await screen.findByDisplayValue("5")).toBeInTheDocument();
    expect(screen.getByLabelText("Zielwert aus deinen letzten Shots: 5.33")).toHaveTextContent("Ziel: 5.33");
    expect(screen.queryByRole("button", { name: "Übernehmen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ausblenden" })).not.toBeInTheDocument();
  });

  it("ordnet Bewertungsoptionen einheitlich nach optimal, leicht und deutlich abweichend ein", async () => {
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByRole("slider", { name: "Extraktionszeit" });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    const balanced = await screen.findByRole("button", { name: "Ausgewogen" });
    const slightlySour = screen.getByRole("button", { name: "Leicht sauer" });
    const tooSour = screen.getByRole("button", { name: "Zu sauer" });
    fireEvent.click(balanced);
    expect(balanced).toHaveClass("bg-black", "text-white");
    fireEvent.click(slightlySour);
    expect(slightlySour).toHaveClass("bg-[#757575]", "text-white");
    fireEvent.click(tooSour);
    expect(tooSour).toHaveClass("bg-[var(--crema-error-soft)]", "text-[var(--crema-error)]");

    const evenFlow = screen.getByRole("button", { name: "Gleichmäßig" });
    const minorFlow = screen.getByRole("button", { name: "Leichtes Channeling" });
    const strongFlow = screen.getByRole("button", { name: "Starkes Channeling" });
    fireEvent.click(evenFlow);
    expect(evenFlow).toHaveClass("bg-black", "text-white");
    fireEvent.click(minorFlow);
    expect(minorFlow).toHaveClass("bg-[#757575]", "text-white");
    fireEvent.click(strongFlow);
    expect(strongFlow).toHaveClass("bg-[var(--crema-error-soft)]", "text-[var(--crema-error)]");

    const idealPuck = screen.getByRole("button", { name: "Normal" });
    const wetPuck = screen.getByRole("button", { name: "Nass" });
    const stuckPuck = screen.getByRole("button", { name: "Festhängend" });
    fireEvent.click(idealPuck);
    expect(idealPuck).toHaveClass("bg-black", "text-white");
    fireEvent.click(wetPuck);
    expect(wetPuck).toHaveClass("bg-[#757575]", "text-white");
    fireEvent.click(stuckPuck);
    expect(stuckPuck).toHaveClass("bg-[var(--crema-error-soft)]", "text-[var(--crema-error)]");
  });

  it("nutzt fünf Geschmacksstufen und öffnet nach dem Speichern das Dashboard", async () => {
    mocks.saveShot.mockResolvedValue({ ok: true, message: "gespeichert", id: "66666666-6666-4666-8666-666666666666", score: 88, coverage: 100 });
    render(<ShotWizard userId="user-1" beans={[bean]} equipment={[machine, grinder]} settings={settings} lastShot={lastShot} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByRole("slider", { name: "Extraktionszeit" });
    fireEvent.change(screen.getByRole("slider", { name: "Extraktionszeit" }), { target: { value: "29" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    for (const taste of ["Zu sauer", "Leicht sauer", "Ausgewogen", "Leicht bitter", "Zu bitter"]) {
      const tasteButton = await screen.findByRole("button", { name: taste });
      expect(tasteButton).toBeInTheDocument();
      expect(tasteButton).toHaveTextContent("");
    }
    expect(screen.getByText("Zu sauer")).toBeInTheDocument();
    expect(screen.getByText("Zu bitter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ausgewogen" }));
    fireEvent.click(screen.getByRole("button", { name: "Shot speichern" }));
    await waitFor(() => expect(mocks.saveShot).toHaveBeenCalledWith(expect.objectContaining({ taste: "balanced", overallTasteRating: 5 })));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/app"));
  });
});
