import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeanForm } from "./bean-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  saveBean: vi.fn(),
  invalidateBeanData: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, back: mocks.back }) }));
vi.mock("@/features/data/actions", () => ({ saveBean: mocks.saveBean }));
vi.mock("@/hooks/use-private-cache", () => ({ usePrivateCache: () => ({ invalidateBeanData: mocks.invalidateBeanData }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("BeanForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveBean.mockResolvedValue({ ok: true, message: "Bohne gespeichert", id: "bean-1" });
    mocks.invalidateBeanData.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("speichert eine neue Bohne über den Haken in der Topbar", async () => {
    const { container } = render(<BeanForm userId="user-1" />);
    const form = container.querySelector("form");
    expect(form).toHaveClass("fixed", "grid-rows-[auto_minmax(0,1fr)]");
    expect(screen.getByRole("heading", { name: "Neue Bohne" })).toBeInTheDocument();
    expect(container.querySelector("footer")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Name der Bohne" }), { target: { value: "La Esperanza" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Rösterei / Hersteller" }), { target: { value: "Test Roasters" } });

    const roastPicker = screen.getByRole("group", { name: "Röstgrad" });
    fireEvent.click(within(roastPicker).getByRole("button", { name: "Röstgrad: Dunkel" }));
    expect(within(roastPicker).getByRole("button", { name: "Röstgrad: Dunkel" })).toHaveAttribute("aria-pressed", "true");
    expect(within(roastPicker).getByRole("button", { name: "Röstgrad: Dunkel" })).toHaveClass("bg-black", "text-white");

    const processPicker = screen.getByRole("group", { name: "Aufbereitung" });
    fireEvent.click(within(processPicker).getByRole("button", { name: "Aufbereitung: Natural" }));
    expect(within(processPicker).getByRole("button", { name: "Aufbereitung: Natural" })).toHaveAttribute("aria-pressed", "true");
    expect(within(processPicker).getByRole("button", { name: "Aufbereitung: Natural" })).toHaveClass("bg-black", "text-white");

    fireEvent.click(screen.getByRole("button", { name: "Bohne speichern" }));

    await waitFor(() => expect(mocks.saveBean).toHaveBeenCalledOnce());
    expect(mocks.saveBean).toHaveBeenCalledWith(expect.objectContaining({
      name: "La Esperanza",
      roaster: "Test Roasters",
      roastLevel: "dark",
      process: "natural",
    }));
    expect(mocks.invalidateBeanData).toHaveBeenCalledWith({ userId: "user-1", beanId: "bean-1", touchesDashboard: true });
    expect(mocks.push).toHaveBeenCalledWith("/app/beans");
  });

  it("überlässt das Öffnen des Datums ausschließlich dem nativen Input", () => {
    render(<BeanForm userId="user-1" />);
    const dateInput = screen.getByLabelText("Röstdatum") as HTMLInputElement & { showPicker?: () => void };
    const showPicker = vi.fn();
    dateInput.showPicker = showPicker;

    fireEvent.click(dateInput);

    expect(showPicker).not.toHaveBeenCalled();
  });

  it("gliedert Herkunft und Aufbereitung als eigenen Abschnitt", () => {
    render(<BeanForm userId="user-1" />);
    expect(screen.getByRole("heading", { name: "Röstung" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Herkunft & Aufbereitung" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Herkunft" })).toBeInTheDocument();
  });
});
