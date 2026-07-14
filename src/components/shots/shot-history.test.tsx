import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShotHistory } from "./shot-history";
import type { ShotSummary } from "@/types/domain";

vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const makeShot = (id: string, taste: "balanced" | "sour" | "bitter", time: number, yieldGrams: number): ShotSummary => ({
  id,
  bean_id: "b",
  machine_id: null,
  grinder_id: null,
  basket_id: null,
  shot_at: "2026-07-13T08:00:00Z",
  grind_setting: "2.4",
  dose_grams: 19,
  extraction_seconds: time,
  stop_weight_grams: 34,
  final_yield_grams: yieldGrams,
  taste,
  flow: "even",
  score: 90,
  score_coverage: 100,
  target_recipe_snapshot: null,
  scoring_version: "2.0.0-simple",
  beans: { id: "b", name: `${taste} bean`, roaster: "R", roast_date: "2026-07-01", origin: null },
});

describe("Shot-Historie", () => {
  it("filtert sauer und Sweet Spot", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36), makeShot("2", "sour", 22, 38), makeShot("3", "bitter", 36, 36)]} />);
    fireEvent.click(screen.getByRole("button", { name: "Sauer" }));
    expect(screen.getByText("sour bean")).toBeInTheDocument();
    expect(screen.queryByText("balanced bean")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sweet Spot" }));
    expect(screen.getByText("balanced bean")).toBeInTheDocument();
  });
});
