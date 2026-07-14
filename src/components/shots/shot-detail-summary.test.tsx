import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ShotWithBean } from "@/types/domain";
import { ShotDetailSummary, ShotMoreDetails } from "./shot-detail-summary";

const shot: ShotWithBean = {
  id: "shot-1",
  user_id: "user-1",
  bean_id: "bean-1",
  machine_id: "machine-1",
  grinder_id: "grinder-1",
  basket_id: null,
  shot_at: "2026-07-13T08:00:00Z",
  grind_setting: "5.2",
  dose_grams: 18,
  prep_tools: ["WDT", "Puck Screen"],
  extraction_seconds: 29,
  stop_weight_grams: 34,
  final_yield_grams: 36,
  taste: "balanced",
  flow: "even",
  puck: "ideal",
  notes: "Süß und klar",
  score: 91,
  overall_taste_rating: 4,
  target_recipe_snapshot: null,
  applied_recommendation_id: null,
  recommendation_applied: false,
  recommendation_changes: null,
  experiment_mode: false,
  scoring_version: "2.0.0-simple",
  score_coverage: 100,
  score_status: "Sehr detailliert",
  created_at: "",
  updated_at: "",
  beans: { id: "bean-1", name: "Worka", roaster: "Test Rösterei", roast_date: null, origin: "Äthiopien" },
};

afterEach(cleanup);

describe("Shot-Detailzusammenfassung", () => {
  it("visualisiert Kernwerte, Gewichtsverlauf und Bewertung ohne Score", () => {
    render(<ShotDetailSummary shot={shot} />);

    expect(screen.getByRole("heading", { name: "Extraktion auf einen Blick" })).toBeInTheDocument();
    expect(screen.getByText("5.2")).toBeInTheDocument();
    expect(screen.getByText("29,0 s")).toBeInTheDocument();
    expect(screen.getByLabelText("Brew Ratio 1 : 2,00")).toBeInTheDocument();
    expect(screen.getByLabelText("Gewichtsverlauf: Stop 34,0 g, final 36,0 g, Nachlauf 2,0 g")).toBeInTheDocument();
    expect(screen.getByLabelText("Geschmack: Ausgewogen")).toBeInTheDocument();
    expect(screen.queryByText("Gesamtbewertung")).not.toBeInTheDocument();
    expect(screen.queryByText("91")).not.toBeInTheDocument();
  });

  it("zeigt Geräte und weitere Angaben vollständig", () => {
    render(<ShotMoreDetails
      shot={shot}
      machine={{ name: "Linea Mini", type: "machine" }}
      grinder={{ name: "Niche Zero", type: "grinder" }}
      basket={null}
    />);

    expect(screen.getByText("Linea Mini")).toBeInTheDocument();
    expect(screen.getByText("Niche Zero")).toBeInTheDocument();
    expect(screen.getByText("WDT · Puck Screen")).toBeInTheDocument();
    expect(screen.getByText("Gleichmäßig")).toBeInTheDocument();
    expect(screen.getByText("Süß und klar")).toBeInTheDocument();
  });

  it("stellt fehlende Messwerte ohne ungültige Grafikwerte dar", () => {
    const { container } = render(<ShotDetailSummary shot={{ ...shot, dose_grams: null, extraction_seconds: null, stop_weight_grams: null, final_yield_grams: null, taste: null, overall_taste_rating: null }} />);

    expect(screen.getByLabelText("Brew Ratio —")).toBeInTheDocument();
    expect(screen.getByLabelText("Geschmack: nicht angegeben")).toBeInTheDocument();
    expect(screen.queryByText("Gesamtbewertung")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("NaN");
  });
});
