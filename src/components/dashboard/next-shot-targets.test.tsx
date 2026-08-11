import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ShotSummary } from "@/types/domain";
import { NextShotTargets } from "./next-shot-targets";

afterEach(cleanup);

describe("NextShotTargets", () => {
  it("erklärt für jeden Zielwert, ob er neu empfohlen oder übernommen wurde", () => {
    const latestShot = {
      id: "shot-1",
      bean_id: "bean-1",
      shot_at: "2026-07-15T08:00:00Z",
      dose_grams: 18,
      grind_setting: "5",
      extraction_seconds: 19,
      stop_weight_grams: 34,
      final_yield_grams: 36,
    } as ShotSummary;

    render(<NextShotTargets latestShot={latestShot} history={[latestShot]} />);

    expect(screen.getByRole("article", { name: "Kaffeemenge: 18,0 g. Vom letzten Shot" })).toHaveTextContent("Vom letzten Shot");
    expect(screen.getByRole("article", { name: "Mahlgrad: 5.33. Neu empfohlen" })).toHaveTextContent("Neu empfohlen");
    expect(screen.getByRole("article", { name: "Stop-Gewicht: 34,0 g. Vom letzten Shot" })).toHaveTextContent("Vom letzten Shot");
  });
});
