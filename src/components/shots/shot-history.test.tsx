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
    expect(screen.getByText("Zeit")).toBeInTheDocument();
    expect(screen.queryByText("Extraktionszeit")).not.toBeInTheDocument();
    expect(screen.getByText("28,0 s")).toBeInTheDocument();
    expect(screen.getByText("34 / 36 g")).toBeInTheDocument();
    expect(screen.queryByText("Ratio")).not.toBeInTheDocument();
    expect(screen.queryByText("90")).not.toBeInTheDocument();
  });

  it("wechselt zur Tabelle und öffnet eine Zeile per Tastatur", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36), makeShot("2", "sour", 22, 38)]} />);

    fireEvent.click(screen.getByRole("button", { name: "Tabellenansicht" }));

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Datum" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Stop-Gewicht" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Finales Gewicht" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Ratio" })).not.toBeInTheDocument();
    expect(within(table).getAllByText("34,0")).toHaveLength(2);
    expect(within(table).getByText("38,0")).toBeInTheDocument();
    expect(within(table).queryByText("balanced bean")).not.toBeInTheDocument();
    expect(within(table).queryByText("sour bean")).not.toBeInTheDocument();
    const beanTones = [...table.querySelectorAll<HTMLElement>("[data-bean-tone]")].map((icon) => icon.dataset.beanTone);
    expect(new Set(beanTones).size).toBe(2);

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
    const table = screen.getByRole("table");
    expect(within(table).getByRole("link", { name: /sour bean/ })).toBeInTheDocument();
    expect(within(table).queryByRole("link", { name: /balanced bean/ })).not.toBeInTheDocument();
    expect(within(table).queryByText("sour bean")).not.toBeInTheDocument();
  });
});
