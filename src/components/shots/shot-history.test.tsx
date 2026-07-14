import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShotHistory } from "./shot-history";
import type { ShotSummary } from "@/types/domain";

const router = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeShot = (id: string, taste: "balanced" | "sour" | "bitter", time: number, yieldGrams: number): ShotSummary => ({
  id,
  bean_id: `b-${taste}`,
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
  beans: { id: `b-${taste}`, name: `${taste} bean`, roaster: "R", roast_date: "2026-07-01", origin: "Äthiopien" },
});

describe("Shot-Historie", () => {
  it("zeigt in der Kartenansicht die Kernwerte ohne Filter oder Score", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36)]} />);

    expect(screen.queryByRole("button", { name: "Sauer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sweet Spot" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /balanced bean/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Flagge Äthiopien")).toBeInTheDocument();
    expect(screen.getByText("Mahlgrad")).toBeInTheDocument();
    expect(screen.getByText("2.4")).toBeInTheDocument();
    expect(screen.getByText("28,0 s")).toBeInTheDocument();
    expect(screen.getByText("34,0 / 36,0 g")).toBeInTheDocument();
    expect(screen.getByLabelText("Brew Ratio 1 : 1,89")).toBeInTheDocument();
    expect(screen.queryByText("90")).not.toBeInTheDocument();
  });

  it("wechselt zur Tabelle und öffnet eine Zeile per Tastatur", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36), makeShot("2", "sour", 22, 38)]} />);

    fireEvent.click(screen.getByRole("button", { name: "Tabellenansicht" }));

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Bohne" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Stop" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Final" })).toBeInTheDocument();
    expect(within(table).getAllByText("34,0 g")).toHaveLength(2);
    expect(within(table).getByText("38,0 g")).toBeInTheDocument();

    const row = screen.getByRole("link", { name: /balanced bean/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(router.push).toHaveBeenCalledWith("/app/shots/1");

    fireEvent.click(screen.getByRole("button", { name: "Kartenansicht" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("filtert Karten und Tabelle nach Bohne", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36), makeShot("2", "sour", 22, 38)]} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Nach Bohne filtern" }), { target: { value: "b-sour" } });
    expect(screen.getByRole("link", { name: /sour bean/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /balanced bean/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tabellenansicht" }));
    expect(within(screen.getByRole("table")).getByText("sour bean")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("balanced bean")).not.toBeInTheDocument();
  });
});
