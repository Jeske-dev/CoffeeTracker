import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BeanSelectControl, nullableNumber, nullableString, requiredNumber, SelectControl } from "./shot-form-controls";
import type { Bean, Equipment } from "@/types/domain";

const bean = (id: string, name: string, origin: string | null): Bean => ({
  id,
  user_id: "user-1",
  name,
  roaster: "Test Roaster",
  roast_date: null,
  origin,
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
});

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

describe("visuelle Shot-Auswahl", () => {
  afterEach(() => cleanup());

  it("behält leere Browserwerte als null beziehungsweise undefined", () => {
    expect(nullableNumber.setValueAs(null)).toBeNull();
    expect(nullableNumber.setValueAs("")).toBeNull();
    expect(nullableString.setValueAs(undefined)).toBeNull();
    expect(requiredNumber.setValueAs(null)).toBeUndefined();
    expect(nullableNumber.setValueAs("28.5")).toBe(28.5);
  });

  it("zeigt die Länderflagge im gewählten Wert und in den Bohnenoptionen", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const colombia = bean("11111111-1111-4111-8111-111111111111", "Colombia", "Colombia");
    const kenya = bean("22222222-2222-4222-8222-222222222222", "Kenya", "Kenya");
    render(<BeanSelectControl label="Bohne wählen" options={[colombia, kenya]} value={colombia.id} onValueChange={onValueChange} />);

    const trigger = screen.getByRole("combobox", { name: "Bohne wählen" });
    expect(trigger).toHaveTextContent("Colombia");
    expect(screen.getByRole("img", { name: "Flagge Colombia" })).toBeInTheDocument();

    await user.click(trigger);
    const kenyaLabel = await screen.findByText("Kenya");
    const option = kenyaLabel.closest('[role="option"]');
    expect(option).not.toBeNull();
    expect(option?.querySelector('[data-entity-icon="bean-flag"]')).toBeInTheDocument();
    await user.click(option as HTMLElement);
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(kenya.id));
  });

  it("verwendet für Maschine und Mühle ihre gemeinsamen Equipment-Icons", () => {
    const machine = equipment("33333333-3333-4333-8333-333333333333", "machine", "Linea Mini");
    const grinder = equipment("44444444-4444-4444-8444-444444444444", "grinder", "Niche Zero");
    const { container, rerender } = render(<SelectControl label="Maschine" equipmentType="machine" options={[machine]} value={machine.id} onValueChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Maschine" })).toHaveTextContent("Linea Mini");
    expect(container.querySelector('[data-entity-icon="machine"]')).toBeInTheDocument();

    rerender(<SelectControl label="Mühle" equipmentType="grinder" options={[grinder]} value={grinder.id} onValueChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Mühle" })).toHaveTextContent("Niche Zero");
    expect(container.querySelector('[data-entity-icon="grinder"]')).toBeInTheDocument();
  });
});
