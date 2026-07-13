import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallationProvider } from "@/hooks/use-pwa-installation";
import { InstallDialedCard } from "./install-dialed-card";

function setDevice({ standalone = false, ios = false }: { standalone?: boolean; ios?: boolean } = {}) {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: standalone, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: ios ? "Mozilla/5.0 (iPhone) AppleWebKit Safari" : "Mozilla/5.0 Chrome" });
  Object.defineProperty(navigator, "platform", { configurable: true, value: ios ? "iPhone" : "Linux" });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: ios ? 5 : 0 });
}

function renderCard(props: { variant: "dashboard" | "settings"; shotCount?: number }) {
  return render(<PwaInstallationProvider><InstallDialedCard {...props} /></PwaInstallationProvider>);
}

describe("InstallDialedCard", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-base-ui-scroll-locked");
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setDevice();
  });

  it("öffnet den nativen Dialog erst nach dem Klick", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    renderCard({ variant: "dashboard", shotCount: 2 });
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }) });
    act(() => window.dispatchEvent(event));

    const button = await screen.findByRole("button", { name: "App installieren" });
    expect(prompt).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText("Dialed als App nutzen")).not.toBeInTheDocument());
  });

  it("zeigt unter iOS nur die manuelle Anleitung", async () => {
    setDevice({ ios: true });
    renderCard({ variant: "dashboard", shotCount: 2 });
    fireEvent.click(await screen.findByRole("button", { name: "So geht’s" }));
    expect(await screen.findByText("Tippe in Safari auf „Teilen“." )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "App installieren" })).not.toBeInTheDocument();
  });

  it("erscheint nicht im Standalone-Modus", async () => {
    setDevice({ standalone: true });
    renderCard({ variant: "dashboard", shotCount: 2 });
    await waitFor(() => expect(screen.queryByText("Dialed als App nutzen")).not.toBeInTheDocument());
  });

  it("respektiert Später, bleibt in den Einstellungen aber verfügbar", async () => {
    const first = renderCard({ variant: "dashboard", shotCount: 2 });
    fireEvent.click(await screen.findByRole("button", { name: "Später" }));
    first.unmount();

    renderCard({ variant: "dashboard", shotCount: 2 });
    await waitFor(() => expect(screen.queryByText("Dialed als App nutzen")).not.toBeInTheDocument());

    renderCard({ variant: "settings" });
    expect(await screen.findByText("App-Version")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Installationsanleitung" })).toBeInTheDocument();
  });
});
