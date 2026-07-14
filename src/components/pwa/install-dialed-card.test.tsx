import { readFileSync } from "node:fs";
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

function renderCard() {
  return render(<PwaInstallationProvider><InstallDialedCard /></PwaInstallationProvider>);
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
    renderCard();
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }) });
    act(() => window.dispatchEvent(event));

    const button = await screen.findByRole("button", { name: "Dialed installieren" });
    expect(prompt).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByText("Dialed ist auf diesem Gerät installiert.")).toBeInTheDocument());
  });

  it("zeigt unter iOS nur die manuelle Anleitung", async () => {
    setDevice({ ios: true });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "iOS-Anleitung" }));
    expect(await screen.findByText("Tippe in Safari auf „Teilen“." )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "App installieren" })).not.toBeInTheDocument();
  });

  it("zeigt in den Einstellungen den installierten Status", async () => {
    setDevice({ standalone: true });
    renderCard();
    expect(await screen.findByText("Dialed ist auf diesem Gerät installiert.")).toBeInTheDocument();
    expect(screen.getByText("App-Version")).toBeInTheDocument();
  });

  it("wird nicht mehr auf dem Dashboard eingebunden", () => {
    const dashboard = readFileSync("src/app/app/page.tsx", "utf8");
    expect(dashboard).not.toContain("InstallDialedCard");
    expect(dashboard).not.toContain("Dialed als App nutzen");
  });
});
