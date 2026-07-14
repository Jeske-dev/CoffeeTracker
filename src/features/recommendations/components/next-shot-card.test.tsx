import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextShotCard } from "./next-shot-card";
import type { RecommendationBundleRecord } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  applyRecommendation: vi.fn().mockResolvedValue({ ok: true, message: "ok" }),
  dismissRecommendation: vi.fn().mockResolvedValue({ ok: true, message: "ok" }),
  invalidateRecommendationData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/data/actions", () => ({
  applyRecommendation: mocks.applyRecommendation,
  dismissRecommendation: mocks.dismissRecommendation,
}));
vi.mock("@/hooks/use-private-cache", () => ({
  usePrivateCache: () => ({ invalidateRecommendationData: mocks.invalidateRecommendationData }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const recommendation: RecommendationBundleRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: "user-1",
  source_shot_id: "33333333-3333-4333-8333-333333333333",
  bean_id: "11111111-1111-4111-8111-111111111111",
  machine_id: "44444444-4444-4444-8444-444444444444",
  grinder_id: "55555555-5555-4555-8555-555555555555",
  basket_id: null,
  target_recipe_snapshot: {
    doseGrams: 18,
    targetYieldGrams: 36,
    targetExtractionTimeSeconds: 30,
    grindSetting: "5",
    prepTools: ["WDT"],
  },
  engine_version: "2.0.0-simple",
  primary_action: {
    actionType: "GRIND_FINER",
    priorityTier: 3,
    severity: 1,
    confidence: 0.7,
    expectedImpact: 0.7,
    personalEffectiveness: 0.5,
    title: "Einen Klick feiner mahlen",
    summary: "Zeit und Geschmack zeigen in dieselbe Richtung.",
    explanation: "Der letzte Shot lief zu schnell und schmeckte sauer.",
    changes: [{ field: "grindSetting", previousValue: "5", recommendedValue: "4" }],
    evidence: [{ label: "Zeit", value: "24 statt 30 Sekunden" }],
    suppressedReasons: [],
  },
  execution_adjustments: {
    recommendedStopWeightGrams: 34,
    expectedOvershootGrams: 2,
    sampleSize: 3,
    confidence: 0.65,
  },
  confidence: 0.7,
  confidence_label: "Mittlere Sicherheit",
  evidence: [],
  status: "active",
  applied_at: null,
  dismissed_at: null,
  resulting_shot_id: null,
  user_feedback: null,
  outcome: null,
  created_at: "2026-07-13T08:00:00Z",
  updated_at: "2026-07-13T08:00:00Z",
};

describe("NextShotCard", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyRecommendation.mockResolvedValue({ ok: true, message: "ok" });
    mocks.dismissRecommendation.mockResolvedValue({ ok: true, message: "ok" });
  });

  it("zeigt genau einen aktiven Tipp und erklärt ihn inline", () => {
    render(<NextShotCard recommendation={recommendation} beanName="Test Bean" />);

    expect(screen.getAllByText("Tipp für deinen nächsten Shot")).toHaveLength(1);
    expect(screen.queryByText("Zeit und Geschmack zeigen in dieselbe Richtung.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Warum?" }));
    expect(screen.getByText("Zeit und Geschmack zeigen in dieselbe Richtung.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("entfernt einen weggeklickten Tipp sofort und speichert die Entscheidung", async () => {
    render(<NextShotCard recommendation={recommendation} />);

    fireEvent.click(screen.getByRole("button", { name: "Tipp ausblenden" }));
    expect(screen.queryByText("Tipp für deinen nächsten Shot")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.dismissRecommendation).toHaveBeenCalledWith(recommendation.id));
    expect(mocks.invalidateRecommendationData).toHaveBeenCalledWith("user-1");
  });

  it("markiert den Tipp als angewendet und öffnet den Shot-Flow", async () => {
    render(<NextShotCard recommendation={recommendation} />);

    fireEvent.click(screen.getByRole("button", { name: "Shot mit Tipp starten" }));
    await waitFor(() => expect(mocks.applyRecommendation).toHaveBeenCalledWith(recommendation.id));
    expect(mocks.push).toHaveBeenCalledWith(`/app/shots/new?recommendation=${recommendation.id}`);
  });

  it("rendert einen bereits weggeklickten Tipp auch nach erneutem Laden nicht", () => {
    render(<NextShotCard recommendation={{ ...recommendation, status: "dismissed", dismissed_at: "2026-07-13T09:00:00Z" }} />);
    expect(screen.queryByText("Tipp für deinen nächsten Shot")).not.toBeInTheDocument();
  });
});
