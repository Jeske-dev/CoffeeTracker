import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RecommendationBundleRecord, ShotSummary } from "@/types/domain";
import { NextShotTargets } from "./next-shot-targets";

afterEach(cleanup);

describe("NextShotTargets", () => {
  it("erklärt für jeden Zielwert, ob er neu empfohlen oder übernommen wurde", () => {
    const latestShot = {
      dose_grams: 18,
      grind_setting: "5",
      stop_weight_grams: 34,
    } as ShotSummary;
    const recommendation = {
      target_recipe_snapshot: { doseGrams: 18, grindSetting: "5" },
      primary_action: { changes: [{ field: "grindSetting", recommendedValue: "4.5" }] },
      execution_adjustments: { recommendedStopWeightGrams: 33.5 },
    } as unknown as RecommendationBundleRecord;

    render(<NextShotTargets recommendation={recommendation} latestShot={latestShot} />);

    expect(screen.getByRole("article", { name: "Kaffeemenge: 18,0 g. Vom letzten Shot" })).toHaveTextContent("Vom letzten Shot");
    expect(screen.getByRole("article", { name: "Mahlgrad: 4.5. Neu empfohlen" })).toHaveTextContent("Neu empfohlen");
    expect(screen.getByRole("article", { name: "Stop-Gewicht: 33,5 g. Neu empfohlen" })).toHaveTextContent("Neu empfohlen");
  });
});
