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
  it("zeigt ausschließlich die wichtigsten Werte in einer Tabelle", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36), makeShot("2", "sour", 22, 38)]} />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Datum" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Mahlgrad" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Zeit" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Stop-Gewicht" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Finales Gewicht" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Ratio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Nach Bohne filtern" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kartenansicht" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tabellenansicht" })).not.toBeInTheDocument();
    expect(within(table).getAllByText("34,0")).toHaveLength(2);
    expect(within(table).getByText("38,0")).toBeInTheDocument();
    expect(within(table).getByLabelText("Zeit: 28,0 s")).toHaveTextContent("28,0 s");
    expect(within(table).getAllByLabelText("Stop-Gewicht: 34,0 g")).toHaveLength(2);
    expect(within(table).getByLabelText("Finales Gewicht: 38,0 g")).toHaveTextContent("38,0 g");
    expect(within(table).getAllByLabelText("Mahlgrad: 2.4")).toHaveLength(2);
    expect(screen.getAllByLabelText("Flagge Äthiopien")).toHaveLength(2);
    expect(within(table).queryByText("balanced bean")).not.toBeInTheDocument();
    expect(within(table).queryByText("sour bean")).not.toBeInTheDocument();
    expect(within(table).queryByText("90")).not.toBeInTheDocument();
    const beanTones = [...table.querySelectorAll<HTMLElement>("[data-bean-tone]")].map((icon) => icon.dataset.beanTone);
    expect(new Set(beanTones).size).toBe(2);
  });

  it("öffnet eine Tabellenzeile per Tastatur", () => {
    render(<ShotHistory shots={[makeShot("1", "balanced", 28, 36)]} />);

    const row = screen.getByRole("link", { name: /balanced bean/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(router.push).toHaveBeenCalledWith("/app/shots/1");
  });
});
