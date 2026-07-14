import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupForm } from "./setup-form";
import { PwaInstallationProvider } from "@/hooks/use-pwa-installation";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveSetup: vi.fn().mockResolvedValue({ ok: true, message: "Setup wurde gespeichert" }),
  invalidateSetupData: vi.fn().mockResolvedValue(undefined),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/features/data/actions", () => ({ saveSetup: mocks.saveSetup }));
vi.mock("@/hooks/use-private-cache", () => ({ usePrivateCache: () => ({ invalidateSetupData: mocks.invalidateSetupData }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));

const machine = { id: "machine", user_id: "user-a", type: "machine" as const, name: "Linea Mini", notes: null, archived_at: null, created_at: "", updated_at: "" };
const grinder = { id: "grinder", user_id: "user-a", type: "grinder" as const, name: "Niche Zero", notes: null, archived_at: null, created_at: "", updated_at: "" };
const settings = { user_id: "user-a", default_machine_id: machine.id, default_grinder_id: grinder.id, last_bean_id: null, auto_fill: true, default_prep_tools: ["WDT"], dial_in_suggestions_enabled: true, roast_age_warning_enabled: true, roast_age_warning_days: 45, created_at: "", updated_at: "" };

function renderConfiguredSetup() {
  return render(<PwaInstallationProvider><SetupForm userId="user-a" displayName="Brian" email="brian@example.com" equipment={[machine, grinder]} settings={settings}/></PwaInstallationProvider>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve; });
  return { promise, resolve };
}

describe("SetupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveSetup.mockResolvedValue({ ok: true, message: "Setup wurde gespeichert" });
    mocks.invalidateSetupData.mockResolvedValue(undefined);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  });
  afterEach(() => cleanup());

  it("speichert beim ersten Rendern nicht unnötig", async () => {
    renderConfiguredSetup();
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    expect(mocks.saveSetup).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("speichert Maschine und Mühle automatisch ohne Speichern-Button", async () => {
    render(<PwaInstallationProvider><SetupForm userId="user-a" displayName="Brian" email="brian@example.com" equipment={[]} settings={null}/></PwaInstallationProvider>);

    fireEvent.change(screen.getByLabelText("Siebträgermaschine"), { target: { value: "Linea Mini" } });
    fireEvent.change(screen.getByLabelText("Mühle"), { target: { value: "Niche Zero" } });

    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalled());
    expect(mocks.saveSetup).toHaveBeenCalledWith(expect.objectContaining({ machineName: "Linea Mini", grinderName: "Niche Zero" }));
    expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gespeichert"));
  });

  it("speichert Toggle-Änderungen ebenfalls automatisch", async () => {
    renderConfiguredSetup();

    fireEvent.click(screen.getByRole("switch", { name: "Automatisch vorausfüllen" }));
    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledWith(expect.objectContaining({ autoFill: false })));
  });

  it("speichert Textfelder erst nach abgeschlossener Eingabe", async () => {
    renderConfiguredSetup();

    const machineInput = screen.getByLabelText("Siebträgermaschine");
    fireEvent.focus(machineInput);
    fireEvent.change(machineInput, { target: { value: "Neue Maschine" } });
    fireEvent.click(screen.getByRole("switch", { name: "Automatisch vorausfüllen" }));
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    expect(mocks.saveSetup).not.toHaveBeenCalled();

    fireEvent.blur(machineInput);
    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledWith(expect.objectContaining({ machineName: "Neue Maschine", autoFill: false })));
  });

  it("speichert eine geänderte Röstalter-Warnschwelle", async () => {
    renderConfiguredSetup();
    const warningDays = screen.getByRole("spinbutton", { name: "Warnschwelle in Tagen" });

    fireEvent.focus(warningDays);
    fireEvent.change(warningDays, { target: { value: "60" } });
    fireEvent.blur(warningDays);

    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledWith(expect.objectContaining({ warningDays: 60 })));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gespeichert"));
  });

  it("bietet nach einem Fehler einen funktionierenden Retry an", async () => {
    mocks.saveSetup.mockResolvedValueOnce({ ok: false, message: "Speichern fehlgeschlagen" });
    renderConfiguredSetup();

    fireEvent.click(screen.getByRole("switch", { name: "Automatisch vorausfüllen" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert"));
    expect(mocks.error).toHaveBeenCalledWith("Speichern fehlgeschlagen", expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: "Speichern erneut versuchen" }));
    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gespeichert"));
  });

  it("wiederholt einen fehlgeschlagenen Save nach Wiederherstellung der Verbindung", async () => {
    mocks.saveSetup.mockRejectedValueOnce(new Error("offline"));
    renderConfiguredSetup();

    fireEvent.click(screen.getByRole("switch", { name: "Dial-in-Vorschläge" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert"));
    fireEvent(window, new Event("online"));

    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gespeichert"));
  });

  it("meldet einen Cache-Fehler nicht als fehlgeschlagenen Save", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.invalidateSetupData.mockRejectedValueOnce(new Error("cache"));
    renderConfiguredSetup();

    fireEvent.click(screen.getByRole("switch", { name: "Röstalter warnen" }));
    await waitFor(() => expect(mocks.invalidateSetupData).toHaveBeenCalled());

    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
    expect(mocks.error).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("invalidate setup cache failed", expect.any(Error));
    consoleError.mockRestore();
  });

  it("führt schnelle Änderungen geordnet nacheinander aus", async () => {
    const firstSave = deferred<{ ok: boolean; message: string }>();
    mocks.saveSetup.mockReturnValueOnce(firstSave.promise);
    renderConfiguredSetup();

    fireEvent.click(screen.getByRole("switch", { name: "Automatisch vorausfüllen" }));
    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("switch", { name: "Dial-in-Vorschläge" }));
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    expect(mocks.saveSetup).toHaveBeenCalledTimes(1);

    firstSave.resolve({ ok: false, message: "Veralteter Save fehlgeschlagen" });
    await waitFor(() => expect(mocks.saveSetup).toHaveBeenCalledTimes(2));
    expect(mocks.saveSetup).toHaveBeenLastCalledWith(expect.objectContaining({ autoFill: false, suggestions: false }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gespeichert"));
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
